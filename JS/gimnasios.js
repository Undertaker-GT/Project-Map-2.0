// ============================================
// GIMNASIOS - VERSIÓN OPTIMIZADA PARA MÓVILES
// ============================================

// Variables globales
let gimnasiosMarkers = {};
let gimnasiosPolygons = {};
let activeGimnasioId = null;
let gimnasiosVisibles = true;

// Capas para gimnasios
let gimnasioPolygonLayer = null;
let gimnasioMarkerLayer = null;

// ============================================
// INICIALIZAR GIMNASIOS
// ============================================
async function inicializarGimnasios() {
    console.log('💪 Inicializando sistema de gimnasios (modo optimizado)...');
    
    await gestorGimnasios.cargarDatos();
    
    const gimnasios = gestorGimnasios.getTodosGimnasios();
    console.log(`📊 ${Object.keys(gimnasios).length} gimnasios disponibles`);
    
    crearCapasGimnasios();
    
    Object.keys(gimnasios).forEach(gimnasioId => {
        const gimnasio = gimnasios[gimnasioId];
        crearFeatureGimnasio(gimnasioId, gimnasio);
    });
    
    configurarEventosGimnasios();
    
    gestorGimnasios.onCambio(() => {
        console.log('🔄 Datos de gimnasios actualizados, refrescando...');
        refrescarGimnasios();
    });
    
    console.log('✅ Sistema de gimnasios inicializado correctamente');
}

// ============================================
// CREAR CAPAS DE GIMNASIOS
// ============================================
function crearCapasGimnasios() {
    // Capa para polígonos - OCULTA POR DEFECTO
    gimnasioPolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FF4500';
            return crearEstiloPoligonoGimnasio(isActive, color);
        },
        visible: false
    });
    map.addLayer(gimnasioPolygonLayer);
    
    // Capa para marcadores - SOLO EMOJI (sin círculo)
    gimnasioMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const gimnasioId = feature.get('gimnasioId');
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FF4500';
            const emoji = feature.get('emoji') || '💪';
            const gimnasioData = feature.get('gimnasioData');
            return crearEstiloMarcadorGimnasio(gimnasioId, isActive, color, emoji, gimnasioData);
        },
        updateWhileAnimating: true,
        updateWhileInteracting: true
    });
    map.addLayer(gimnasioMarkerLayer);
}

// ============================================
// CREAR FEATURE DE GIMNASIO
// ============================================
function crearFeatureGimnasio(gimnasioId, gimnasio) {
    if (!gimnasio.area || gimnasio.area.length < 3) {
        console.warn(`⚠️ Gimnasio ${gimnasioId} sin área válida`);
        return;
    }
    
    try {
        // Crear polígono
        const polygonCoords = gimnasio.area.map(coord => ol.proj.fromLonLat(coord));
        const polygon = new ol.geom.Polygon([polygonCoords]);
        
        const polygonFeature = new ol.Feature({
            geometry: polygon,
            gimnasioId: gimnasioId,
            active: false,
            color: gimnasio.color || '#FF4500'
        });
        gimnasioPolygonLayer.getSource().addFeature(polygonFeature);
        gimnasiosPolygons[gimnasioId] = polygonFeature;
        
        // Crear marcador - SIN CÍRCULO, SOLO EMOJI + NOMBRE
        const markerCoords = gimnasio.iconCoords ? 
            ol.proj.fromLonLat(gimnasio.iconCoords) : 
            ol.proj.fromLonLat(gimnasio.coords);
        
        const markerFeature = new ol.Feature({
            geometry: new ol.geom.Point(markerCoords),
            gimnasioId: gimnasioId,
            active: false,
            color: gimnasio.color || '#FF4500',
            emoji: gimnasio.emoji || '💪',
            gimnasioData: gimnasio
        });
        
        gimnasioMarkerLayer.getSource().addFeature(markerFeature);
        gimnasiosMarkers[gimnasioId] = markerFeature;
        
        console.log(`✅ Gimnasio ${gimnasioId} creado correctamente`);
    } catch (error) {
        console.error(`❌ Error creando gimnasio ${gimnasioId}:`, error);
    }
}

// ============================================
// ESTILOS DE GIMNASIOS
// ============================================
function crearEstiloPoligonoGimnasio(active = false, color = '#FF4500') {
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
function crearEstiloMarcadorGimnasio(gimnasioId, active = false, color = '#FF4500', emoji = '💪', gimnasioData = null) {
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
    let nombreMostrar = gimnasioId;
    if (gimnasioData && gimnasioData.nombre) {
        nombreMostrar = gimnasioData.nombre.length > 12 ? 
            gimnasioData.nombre.substring(0, 10) + '…' : 
            gimnasioData.nombre;
    }
    
    // Opción 1: Emoji + Nombre (recomendado)
    //const displayText = `${emoji} ${nombreMostrar}`;
    
    // Opción 2: Solo emoji (más limpio)
    // const displayText = emoji;
    
    // Opción 3: Emoji arriba, nombre abajo
    const displayText = `${emoji}\n${nombreMostrar}`;
    
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
// ABRIR MODAL DE GIMNASIO
// ============================================
function abrirModalGimnasio(gimnasioId) {
    const gimnasio = gestorGimnasios.getGimnasio(gimnasioId);
    if (!gimnasio) {
        console.warn(`⚠️ Gimnasio ${gimnasioId} no encontrado`);
        return;
    }
    
    activeGimnasioId = gimnasioId;
    
    const titulo = document.getElementById('gimnasioTitulo');
    if (titulo) {
        titulo.textContent = gimnasio.emoji + ' ' + (gimnasio.nombre || 'Gimnasio');
    }
    
    const lista = document.getElementById('listaGimnasios');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    const fotosHTML = gimnasio.fotos && gimnasio.fotos.length > 0 ?
        gimnasio.fotos.map(f => `<img src="${f}" alt="${gimnasio.nombre}" onerror="this.style.display='none'">`).join('') :
        '<p style="color:#94a3b8;font-size:13px;padding:8px;">Sin imágenes disponibles</p>';
    
    const item = document.createElement('div');
    item.className = 'gimnasio-card';
    item.innerHTML = `
        <div class="gimnasio-carousel">
            ${fotosHTML}
        </div>
        <div class="gimnasio-info">
            <div class="gimnasio-detalles">
                <span class="gimnasio-tipo">${gimnasio.tipo || 'Zona de Ejercicio'}</span>
                ${gimnasio.direccion ? `<p class="gimnasio-dir">📍 ${gimnasio.direccion}</p>` : ''}
                ${gimnasio.horario ? `<p class="gimnasio-horario">🕐 ${gimnasio.horario}</p>` : ''}
            </div>
            <button class="gimnasio-btn" onclick="trazarRutaGimnasio('${gimnasioId}')">
                <i class="fas fa-route"></i> Trazar ruta
            </button>
        </div>
    `;
    lista.appendChild(item);
    
    document.getElementById('gimnasioModal').classList.add('active');
}

// ============================================
// CERRAR MODAL DE GIMNASIO
// ============================================
function cerrarModalGimnasio() {
    const modal = document.getElementById('gimnasioModal');
    if (modal) {
        modal.classList.remove('active');
    }
    activeGimnasioId = null;
}

// ============================================
// RUTA AL GIMNASIO
// ============================================
function trazarRutaGimnasio(gimnasioId) {
    const gimnasio = gestorGimnasios.getGimnasio(gimnasioId);
    if (!gimnasio) return;
    
    cerrarModalGimnasio();
    activarGimnasio(gimnasioId, true);
    
    console.log(`🧭 Ruta a ${gimnasio.nombre}`);
    
    if (currentPosition) {
        try {
            const userCoords = ol.proj.fromLonLat([currentPosition.lon, currentPosition.lat]);
            const destinoCoords = ol.proj.fromLonLat(gimnasio.coords);
            
            const routeLayer = new ol.layer.Vector({
                source: new ol.source.Vector(),
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#FF4500',
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
            
            const destMarkerLayer = new ol.layer.Vector({
                source: new ol.source.Vector(),
                style: new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 12,
                        fill: new ol.style.Fill({
                            color: '#FF4500'
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
            
            map.getView().animate({
                center: destinoCoords,
                zoom: 18,
                duration: 1000
            });
            
            setTimeout(() => {
                map.removeLayer(routeLayer);
                map.removeLayer(destMarkerLayer);
                if (gimnasioPolygonLayer) {
                    gimnasioPolygonLayer.setVisible(false);
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
// ACTIVAR GIMNASIO
// ============================================
function activarGimnasio(gimnasioId, mostrarPoligono = false) {
    if (activeGimnasioId !== null) {
        const prevPolygon = gimnasiosPolygons[activeGimnasioId];
        if (prevPolygon) {
            prevPolygon.set('active', false);
            prevPolygon.changed();
        }
        const prevMarker = gimnasiosMarkers[activeGimnasioId];
        if (prevMarker) {
            prevMarker.set('active', false);
            prevMarker.changed();
        }
    }
    
    const polygon = gimnasiosPolygons[gimnasioId];
    if (polygon) {
        polygon.set('active', true);
        polygon.changed();
    }
    
    const marker = gimnasiosMarkers[gimnasioId];
    if (marker) {
        marker.set('active', true);
        marker.changed();
    }
    
    activeGimnasioId = gimnasioId;
    
    const gimnasio = gestorGimnasios.getGimnasio(gimnasioId);
    if (gimnasio && gimnasio.area && gimnasio.area.length > 0) {
        const coords = gimnasio.area.map(c => ol.proj.fromLonLat(c));
        const center = calcularCentroPoligono(coords);
        map.getView().animate({
            center: center,
            zoom: 17,
            duration: 800
        });
    }
    
    if (mostrarPoligono && gimnasioPolygonLayer) {
        gimnasioPolygonLayer.setVisible(true);
    } else {
        if (gimnasioPolygonLayer) {
            gimnasioPolygonLayer.setVisible(false);
        }
    }
}

// ============================================
// REFRESCAR GIMNASIOS
// ============================================
function refrescarGimnasios() {
    if (gimnasioPolygonLayer) {
        gimnasioPolygonLayer.getSource().clear();
    }
    if (gimnasioMarkerLayer) {
        gimnasioMarkerLayer.getSource().clear();
    }
    gimnasiosPolygons = {};
    gimnasiosMarkers = {};
    
    const gimnasios = gestorGimnasios.getTodosGimnasios();
    Object.keys(gimnasios).forEach(gimnasioId => {
        crearFeatureGimnasio(gimnasioId, gimnasios[gimnasioId]);
    });
}

// ============================================
// MOSTRAR/OCULTAR GIMNASIOS
// ============================================
function toggleGimnasios() {
    gimnasiosVisibles = !gimnasiosVisibles;
    
    if (gimnasioPolygonLayer) {
        gimnasioPolygonLayer.setVisible(gimnasiosVisibles);
    }
    if (gimnasioMarkerLayer) {
        gimnasioMarkerLayer.setVisible(gimnasiosVisibles);
    }
    
    const btn = document.getElementById('toggleGimnasiosBtn');
    if (btn) {
        if (gimnasiosVisibles) {
            btn.classList.remove('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                GYM
            `;
            btn.title = 'Ocultar gimnasio';
        } else {
            btn.classList.add('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                Mostrar
            `;
            btn.title = 'Mostrar gimnasio';
        }
    }
    
    console.log(`💪 Gimnasios ${gimnasiosVisibles ? 'visible' : 'oculto'}`);
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventosGimnasios() {
    map.on('click', function(evt) {
        const features = map.getFeaturesAtPixel(evt.pixel, {
            hitTolerance: 15,
            layers: [gimnasioMarkerLayer]
        });
        
        if (features && features.length > 0) {
            const feature = features[0];
            const gimnasioId = feature.get('gimnasioId');
            if (gimnasioId) {
                console.log(`💪 Click en gimnasio: ${gimnasioId}`);
                activarGimnasio(gimnasioId);
                abrirModalGimnasio(gimnasioId);
            }
        }
    });
    
    map.on('pointermove', function(evt) {
        const pixel = map.getEventPixel(evt.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel, {
            hitTolerance: 15,
            layers: [gimnasioMarkerLayer]
        });
        
        const targetId = map.getTarget();
        const targetElement = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        if (targetElement) {
            targetElement.style.cursor = hit ? 'pointer' : 'default';
        }
    });
    
    const closeBtn = document.getElementById('gimnasioModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModalGimnasio);
    }
    
    const modal = document.getElementById('gimnasioModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalGimnasio();
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('gimnasioModal');
            if (modal && modal.classList.contains('active')) {
                cerrarModalGimnasio();
            }
        }
    });
    
    const toggleBtn = document.getElementById('toggleGimnasiosBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleGimnasios);
    }
    
    map.getView().on('change:resolution', function() {
        if (gimnasioMarkerLayer) {
            gimnasioMarkerLayer.changed();
        }
    });
    
    console.log('✅ Eventos de gimnasios configurados correctamente');
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        inicializarGimnasios();
    }, 1300);
});