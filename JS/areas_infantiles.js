// ============================================
// ÁREAS INFANTILES - VERSIÓN OPTIMIZADA PARA MÓVILES
// ============================================

// Variables globales
let areasMarkers = {};
let areasPolygons = {};
let activeAreaId = null;
let areasVisibles = true;

// Capas para áreas infantiles
let areaPolygonLayer = null;
let areaMarkerLayer = null;

// ============================================
// INICIALIZAR ÁREAS INFANTILES
// ============================================
async function inicializarAreasInfantiles() {
    console.log('🛝 Inicializando sistema de áreas infantiles (modo optimizado)...');
    
    await gestorAreasInfantiles.cargarDatos();
    
    const areas = gestorAreasInfantiles.getTodasAreas();
    console.log(`📊 ${Object.keys(areas).length} áreas infantiles disponibles`);
    
    crearCapasAreas();
    
    Object.keys(areas).forEach(areaId => {
        const area = areas[areaId];
        crearFeatureArea(areaId, area);
    });
    
    configurarEventosAreas();
    
    gestorAreasInfantiles.onCambio(() => {
        console.log('🔄 Datos de áreas infantiles actualizados, refrescando...');
        refrescarAreas();
    });
    
    console.log('✅ Sistema de áreas infantiles inicializado correctamente');
}

// ============================================
// CREAR CAPAS DE ÁREAS INFANTILES
// ============================================
function crearCapasAreas() {
    // Capa para polígonos - OCULTA POR DEFECTO
    areaPolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FFD700';
            return crearEstiloPoligonoArea(isActive, color);
        },
        visible: false
    });
    map.addLayer(areaPolygonLayer);
    
    // Capa para marcadores - SOLO EMOJI (sin círculo)
    areaMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const areaId = feature.get('areaId');
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FFD700';
            const emoji = feature.get('emoji') || '🛝';
            const areaData = feature.get('areaData');
            return crearEstiloMarcadorArea(areaId, isActive, color, emoji, areaData);
        },
        updateWhileAnimating: true, // Mejora rendimiento en móviles
        updateWhileInteracting: true
    });
    map.addLayer(areaMarkerLayer);
}

// ============================================
// CREAR FEATURE DE ÁREA INFANTIL
// ============================================
function crearFeatureArea(areaId, area) {
    if (!area.area || area.area.length < 3) {
        console.warn(`⚠️ Área ${areaId} sin área válida`);
        return;
    }
    
    try {
        // Crear polígono
        const polygonCoords = area.area.map(coord => ol.proj.fromLonLat(coord));
        const polygon = new ol.geom.Polygon([polygonCoords]);
        
        const polygonFeature = new ol.Feature({
            geometry: polygon,
            areaId: areaId,
            active: false,
            color: area.color || '#FFD700'
        });
        areaPolygonLayer.getSource().addFeature(polygonFeature);
        areasPolygons[areaId] = polygonFeature;
        
        // Crear marcador - SIN CÍRCULO, SOLO EMOJI + NOMBRE
        const markerCoords = area.iconCoords ? 
            ol.proj.fromLonLat(area.iconCoords) : 
            ol.proj.fromLonLat(area.coords);
        
        const markerFeature = new ol.Feature({
            geometry: new ol.geom.Point(markerCoords),
            areaId: areaId,
            active: false,
            color: area.color || '#FFD700',
            emoji: area.emoji || '🛝',
            areaData: area
        });
        
        areaMarkerLayer.getSource().addFeature(markerFeature);
        areasMarkers[areaId] = markerFeature;
        
        console.log(`✅ Área ${areaId} creada correctamente`);
    } catch (error) {
        console.error(`❌ Error creando área ${areaId}:`, error);
    }
}

// ============================================
// ESTILOS DE ÁREAS INFANTILES
// ============================================
function crearEstiloPoligonoArea(active = false, color = '#FFD700') {
    return new ol.style.Style({
        fill: new ol.style.Fill({
            color: active ? hexToRgba(color, 0.35) : hexToRgba(color, 0.15)
        }),
        stroke: new ol.style.Stroke({
            color: active ? darkenHex(color, 30) : color,
            width: active ? 3 : 2,
            lineDash: active ? [] : [5, 5]
        })
    });
}

// ============================================
// NUEVO ESTILO: EMOJI + NOMBRE SIN CÍRCULO
// ============================================
function crearEstiloMarcadorArea(areaId, active = false, color = '#FFD700', emoji = '🛝', areaData = null) {
    // Colores según estado
    const textColor = active ? '#FFFFFF' : '#333333';
    const bgColor = active ? darkenHex(color, 30) : 'transparent';
    
    // Tamaño de fuente adaptativo según zoom
    const zoom = map.getView().getZoom();
    let emojiSize = 18;
    let nameSize = 10;
    let padding = 3;
    
    if (zoom >= 18) {
        emojiSize = 28;
        nameSize = 13;
        padding = 6;
    } else if (zoom >= 16) {
        emojiSize = 24;
        nameSize = 11;
        padding = 5;
    } else if (zoom >= 14) {
        emojiSize = 20;
        nameSize = 9;
        padding = 4;
    } else if (zoom >= 12) {
        emojiSize = 16;
        nameSize = 8;
        padding = 3;
    } else {
        emojiSize = 14;
        nameSize = 7;
        padding = 2;
    }
    
    // Obtener nombre corto para mostrar (máximo 12 caracteres)
    let nombreMostrar = areaId;
    if (areaData && areaData.nombre) {
        nombreMostrar = areaData.nombre.length > 12 ? 
            areaData.nombre.substring(0, 10) + '…' : 
            areaData.nombre;
    }
    
    // Opción 1: Emoji + Nombre (recomendado)
    //const displayText = `${emoji} ${nombreMostrar}`;
    
    // Opción 2: Solo emoji (más limpio)
    const displayText = emoji;
    
    // Opción 3: Emoji arriba, nombre abajo
    // const displayText = `${emoji}\n${nombreMostrar}`;
    
    return new ol.style.Style({
        text: new ol.style.Text({
            text: displayText,
            font: `${nameSize}px "Segoe UI", Arial, sans-serif`,
            fill: new ol.style.Fill({
                color: textColor
            }),
            stroke: new ol.style.Stroke({
                color: active ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.9)',
                width: active ? 3 : 2
            }),
            textAlign: 'center',
            textBaseline: 'middle',
            offsetY: 0,
            backgroundFill: new ol.style.Fill({
                color: bgColor
            }),
            backgroundStroke: new ol.style.Stroke({
                color: active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                width: 2
            }),
            padding: [padding, padding + 4, padding, padding + 4]
        })
    });
}

// ============================================
// FUNCIONES DE UTILIDAD PARA COLORES
// ============================================
function hexToRgba(hex, alpha = 1) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(245, 222, 179, ${alpha})`;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenHex(hex, amount = 20) {
    let c = hex.replace('#', '');
    if (c.length === 3) {
        c = c.split('').map(char => char + char).join('');
    }
    
    let r = parseInt(c.substring(0, 2), 16);
    let g = parseInt(c.substring(2, 4), 16);
    let b = parseInt(c.substring(4, 6), 16);
    
    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ============================================
// CALCULAR CENTRO DE POLÍGONO
// ============================================
function calcularCentroPoligono(coords) {
    let x = 0, y = 0;
    coords.forEach(coord => {
        x += coord[0];
        y += coord[1];
    });
    return [x / coords.length, y / coords.length];
}

// ============================================
// ABRIR MODAL DE ÁREA INFANTIL
// ============================================
function abrirModalArea(areaId) {
    const area = gestorAreasInfantiles.getArea(areaId);
    if (!area) {
        console.warn(`⚠️ Área ${areaId} no encontrada`);
        return;
    }
    
    activeAreaId = areaId;
    
    // Actualizar título
    const titulo = document.getElementById('areaTitulo');
    if (titulo) {
        titulo.textContent = area.emoji + ' ' + (area.nombre || 'Área Infantil');
    }
    
    // Generar contenido
    const lista = document.getElementById('listaAreas');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    const item = document.createElement('div');
    item.className = 'area-card';
    item.innerHTML = `
        <div class="area-info">
            <div class="area-icono">${area.emoji || '🛝'}</div>
            <div class="area-detalles">
                <h4>${area.nombre || 'Área Infantil'}</h4>
                <span class="area-tipo">Zona de juegos</span>
            </div>
        </div>
        <button class="area-btn-ruta" onclick="trazarRutaArea('${areaId}')">
            <i class="fas fa-route"></i> Trazar ruta
        </button>
    `;
    lista.appendChild(item);
    
    document.getElementById('areaModal').classList.add('active');
}

// ============================================
// CERRAR MODAL DE ÁREA INFANTIL
// ============================================
function cerrarModalArea() {
    const modal = document.getElementById('areaModal');
    if (modal) {
        modal.classList.remove('active');
    }
    activeAreaId = null;
}

// ============================================
// RUTA AL ÁREA INFANTIL
// ============================================
function trazarRutaArea(areaId) {
    const area = gestorAreasInfantiles.getArea(areaId);
    if (!area) return;
    
    cerrarModalArea();
    activarArea(areaId, true);
    
    console.log(`🧭 Ruta a ${area.nombre}`);
    
    if (currentPosition) {
        try {
            const userCoords = ol.proj.fromLonLat([currentPosition.lon, currentPosition.lat]);
            const destinoCoords = ol.proj.fromLonLat(area.coords);
            
            // Mostrar línea de ruta
            const routeLayer = new ol.layer.Vector({
                source: new ol.source.Vector(),
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#FFD700',
                        width: 4,
                        lineDash: [10, 5]
                    })
                })
            });
            
            const routeFeature = new ol.Feature({
                geometry: new ol.geom.LineString([userCoords, destinoCoords])
            });
            
            routeLayer.getSource().addFeature(routeFeature);
            map.addLayer(routeLayer);
            
            // Mostrar marcador de destino
            const destMarkerLayer = new ol.layer.Vector({
                source: new ol.source.Vector(),
                style: new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 12,
                        fill: new ol.style.Fill({
                            color: '#FFD700'
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#FFFFFF',
                            width: 3
                        })
                    })
                })
            });
            
            const destMarker = new ol.Feature({
                geometry: new ol.geom.Point(destinoCoords)
            });
            
            destMarkerLayer.getSource().addFeature(destMarker);
            map.addLayer(destMarkerLayer);
            
            // Animar vista
            map.getView().animate({
                center: destinoCoords,
                zoom: 18,
                duration: 1000
            });
            
            // Eliminar ruta después de 10 segundos
            setTimeout(() => {
                map.removeLayer(routeLayer);
                map.removeLayer(destMarkerLayer);
                if (areaPolygonLayer) {
                    areaPolygonLayer.setVisible(false);
                }
            }, 10000);
        } catch (error) {
            console.error('❌ Error al trazar ruta:', error);
        }
    } else {
        alert('No se pudo obtener tu ubicación actual. Activa el GPS e intenta de nuevo.');
    }
}

// ============================================
// ACTIVAR ÁREA INFANTIL
// ============================================
function activarArea(areaId, mostrarPoligono = false) {
    // Desactivar área anterior
    if (activeAreaId !== null) {
        const prevPolygon = areasPolygons[activeAreaId];
        if (prevPolygon) {
            prevPolygon.set('active', false);
            prevPolygon.changed();
        }
        const prevMarker = areasMarkers[activeAreaId];
        if (prevMarker) {
            prevMarker.set('active', false);
            prevMarker.changed();
        }
    }
    
    // Activar nueva área
    const polygon = areasPolygons[areaId];
    if (polygon) {
        polygon.set('active', true);
        polygon.changed();
    }
    
    const marker = areasMarkers[areaId];
    if (marker) {
        marker.set('active', true);
        marker.changed();
    }
    
    activeAreaId = areaId;
    
    // Centrar el mapa en el área
    const area = gestorAreasInfantiles.getArea(areaId);
    if (area && area.area && area.area.length > 0) {
        const coords = area.area.map(c => ol.proj.fromLonLat(c));
        const center = calcularCentroPoligono(coords);
        map.getView().animate({
            center: center,
            zoom: 17,
            duration: 800
        });
    }

    if (mostrarPoligono && areaPolygonLayer) {
        areaPolygonLayer.setVisible(true);
    } else {
        if (areaPolygonLayer) {
            areaPolygonLayer.setVisible(false);
        }
    }
}

// ============================================
// REFRESCAR ÁREAS INFANTILES
// ============================================
function refrescarAreas() {
    if (areaPolygonLayer) {
        areaPolygonLayer.getSource().clear();
    }
    if (areaMarkerLayer) {
        areaMarkerLayer.getSource().clear();
    }
    areasPolygons = {};
    areasMarkers = {};
    
    const areas = gestorAreasInfantiles.getTodasAreas();
    Object.keys(areas).forEach(areaId => {
        crearFeatureArea(areaId, areas[areaId]);
    });
}

// ============================================
// MOSTRAR/OCULTAR ÁREAS INFANTILES
// ============================================
function toggleAreas() {
    areasVisibles = !areasVisibles;
    
    if (areaPolygonLayer) {
        areaPolygonLayer.setVisible(areasVisibles);
    }
    if (areaMarkerLayer) {
        areaMarkerLayer.setVisible(areasVisibles);
    }
    
    const btn = document.getElementById('toggleAreasBtn');
    if (btn) {
        if (areasVisibles) {
            btn.classList.remove('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                Áreas
            `;
            btn.title = 'Ocultar áreas infantiles';
        } else {
            btn.classList.add('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                Mostrar
            `;
            btn.title = 'Mostrar áreas infantiles';
        }
    }
    
    console.log(`🛝 Áreas infantiles ${areasVisibles ? 'visible' : 'oculto'}`);
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventosAreas() {
    // Click en marcadores de áreas infantiles
    map.on('click', function(evt) {
        const features = map.getFeaturesAtPixel(evt.pixel, {
            hitTolerance: 15,
            layers: [areaMarkerLayer]
        });
        
        if (features && features.length > 0) {
            const feature = features[0];
            const areaId = feature.get('areaId');
            if (areaId) {
                console.log(`🛝 Click en área infantil: ${areaId}`);
                activarArea(areaId);
                abrirModalArea(areaId);
            }
        }
    });
    
    // Hover para cambiar cursor
    map.on('pointermove', function(evt) {
        const pixel = map.getEventPixel(evt.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel, {
            hitTolerance: 15,
            layers: [areaMarkerLayer]
        });
        
        const targetId = map.getTarget();
        const targetElement = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        if (targetElement) {
            targetElement.style.cursor = hit ? 'pointer' : 'default';
        }
    });
    
    // === EVENTOS DEL MODAL DE ÁREAS ===
    const closeBtn = document.getElementById('areaModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModalArea);
    }
    
    const modal = document.getElementById('areaModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalArea();
            }
        });
    }
    
    // Cerrar con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('areaModal');
            if (modal && modal.classList.contains('active')) {
                cerrarModalArea();
            }
        }
    });
    
    // Botón toggle áreas
    const toggleBtn = document.getElementById('toggleAreasBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleAreas);
    }
    
    // === Actualizar estilos al hacer zoom ===
    map.getView().on('change:resolution', function() {
        if (areaMarkerLayer) {
            areaMarkerLayer.changed();
        }
    });
    
    console.log('✅ Eventos de áreas infantiles configurados correctamente');
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        inicializarAreasInfantiles();
    }, 1000);
});