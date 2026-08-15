// ============================================
// CENTROS EDUCATIVOS - VERSIÓN OPTIMIZADA PARA MÓVILES
// ============================================

// Variables globales
let centrosEducativosMarkers = {};
let centrosEducativosPolygons = {};
let activeCentroEducativoId = null;
let centrosEducativosVisibles = true;

// Capas para centros educativos
let centroEducativoPolygonLayer = null;
let centroEducativoMarkerLayer = null;

// ============================================
// INICIALIZAR CENTROS EDUCATIVOS
// ============================================
async function inicializarCentrosEducativos() {
    console.log('🏫 Inicializando sistema de centros educativos (modo optimizado)...');
    
    await gestorCentrosEducativos.cargarDatos();
    
    const centros = gestorCentrosEducativos.getTodosCentros();
    console.log(`📊 ${Object.keys(centros).length} centros educativos disponibles`);
    
    crearCapasCentrosEducativos();
    
    Object.keys(centros).forEach(centroId => {
        const centro = centros[centroId];
        crearFeatureCentroEducativo(centroId, centro);
    });
    
    configurarEventosCentrosEducativos();
    
    gestorCentrosEducativos.onCambio(() => {
        console.log('🔄 Datos de centros educativos actualizados, refrescando...');
        refrescarCentrosEducativos();
    });
    
    console.log('✅ Sistema de centros educativos inicializado correctamente');
}

// ============================================
// CREAR CAPAS DE CENTROS EDUCATIVOS
// ============================================
function crearCapasCentrosEducativos() {
    // Capa para polígonos - OCULTA POR DEFECTO
    centroEducativoPolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#3B5998';
            return crearEstiloPoligonoCentroEducativo(isActive, color);
        },
        visible: false
    });
    map.addLayer(centroEducativoPolygonLayer);
    
    // Capa para marcadores - SOLO EMOJI (sin círculo)
    centroEducativoMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const centroId = feature.get('centroId');
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#3B5998';
            const emoji = feature.get('emoji') || '🏫';
            const centroData = feature.get('centroData');
            return crearEstiloMarcadorCentroEducativo(centroId, isActive, color, emoji, centroData);
        },
        updateWhileAnimating: true,
        updateWhileInteracting: true
    });
    map.addLayer(centroEducativoMarkerLayer);
}

// ============================================
// CREAR FEATURE DE CENTRO EDUCATIVO
// ============================================
function crearFeatureCentroEducativo(centroId, centro) {
    if (!centro.area || centro.area.length < 3) {
        console.warn(`⚠️ Centro educativo ${centroId} sin área válida`);
        return;
    }
    
    try {
        // Crear polígono
        const polygonCoords = centro.area.map(coord => ol.proj.fromLonLat(coord));
        const polygon = new ol.geom.Polygon([polygonCoords]);
        
        const polygonFeature = new ol.Feature({
            geometry: polygon,
            centroId: centroId,
            active: false,
            color: centro.color || '#3B5998'
        });
        centroEducativoPolygonLayer.getSource().addFeature(polygonFeature);
        centrosEducativosPolygons[centroId] = polygonFeature;
        
        // Crear marcador - SIN CÍRCULO, SOLO EMOJI + NOMBRE
        const markerCoords = centro.iconCoords ? 
            ol.proj.fromLonLat(centro.iconCoords) : 
            ol.proj.fromLonLat(centro.coords);
        
        const markerFeature = new ol.Feature({
            geometry: new ol.geom.Point(markerCoords),
            centroId: centroId,
            active: false,
            color: centro.color || '#3B5998',
            emoji: centro.emoji || '🏫',
            centroData: centro
        });
        
        centroEducativoMarkerLayer.getSource().addFeature(markerFeature);
        centrosEducativosMarkers[centroId] = markerFeature;
        
        console.log(`✅ Centro educativo ${centroId} creado correctamente`);
    } catch (error) {
        console.error(`❌ Error creando centro educativo ${centroId}:`, error);
    }
}

// ============================================
// ESTILOS DE CENTROS EDUCATIVOS
// ============================================
function crearEstiloPoligonoCentroEducativo(active = false, color = '#3B5998') {
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
function crearEstiloMarcadorCentroEducativo(centroId, active = false, color = '#3B5998', emoji = '🏫', centroData = null) {
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
    let nombreMostrar = centroId;
    if (centroData && centroData.nombre) {
        nombreMostrar = centroData.nombre.length > 12 ? 
            centroData.nombre.substring(0, 10) + '…' : 
            centroData.nombre;
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
// ABRIR MODAL DE CENTRO EDUCATIVO
// ============================================
function abrirModalCentroEducativo(centroId) {
    const centro = gestorCentrosEducativos.getCentro(centroId);
    if (!centro) {
        console.warn(`⚠️ Centro educativo ${centroId} no encontrado`);
        return;
    }
    
    activeCentroEducativoId = centroId;
    
    const titulo = document.getElementById('centroEducativoTitulo');
    if (titulo) {
        titulo.textContent = centro.emoji + ' ' + (centro.nombre || 'Centro Educativo');
    }
    
    const lista = document.getElementById('listaCentrosEducativos');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    const fotosHTML = centro.fotos && centro.fotos.length > 0 ?
        centro.fotos.map(f => `<img src="${f}" alt="${centro.nombre}" onerror="this.style.display='none'">`).join('') :
        '<p style="color:#94a3b8;font-size:13px;padding:8px;">Sin imágenes disponibles</p>';
    
    const item = document.createElement('div');
    item.className = 'centro-educativo-card';
    item.innerHTML = `
        <div class="centro-educativo-carousel">
            ${fotosHTML}
        </div>
        <div class="centro-educativo-info">
            <div class="centro-educativo-detalles">
                <span class="centro-educativo-tipo">${centro.tipo || 'Institución educativa'}</span>
                ${centro.direccion ? `<p class="centro-educativo-dir">📍 ${centro.direccion}</p>` : ''}
            </div>
            <button class="centro-educativo-btn" onclick="trazarRutaCentroEducativo('${centroId}')">
                <i class="fas fa-route"></i> Trazar ruta
            </button>
        </div>
    `;
    lista.appendChild(item);
    
    document.getElementById('centroEducativoModal').classList.add('active');
}

// ============================================
// CERRAR MODAL DE CENTRO EDUCATIVO
// ============================================
function cerrarModalCentroEducativo() {
    const modal = document.getElementById('centroEducativoModal');
    if (modal) {
        modal.classList.remove('active');
    }
    activeCentroEducativoId = null;
}

// ============================================
// RUTA AL CENTRO EDUCATIVO
// ============================================
function trazarRutaCentroEducativo(centroId) {
    const centro = gestorCentrosEducativos.getCentro(centroId);
    if (!centro) return;
    
    cerrarModalCentroEducativo();
    activarCentroEducativo(centroId, true);
    
    console.log(`🧭 Ruta a ${centro.nombre}`);
    
    if (currentPosition) {
        try {
            const userCoords = ol.proj.fromLonLat([currentPosition.lon, currentPosition.lat]);
            const destinoCoords = ol.proj.fromLonLat(centro.coords);
            
            const routeLayer = new ol.layer.Vector({
                source: new ol.source.Vector(),
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#3B5998',
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
                            color: '#3B5998'
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
                if (centroEducativoPolygonLayer) {
                    centroEducativoPolygonLayer.setVisible(false);
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
// ACTIVAR CENTRO EDUCATIVO
// ============================================
function activarCentroEducativo(centroId, mostrarPoligono = false) {
    if (activeCentroEducativoId !== null) {
        const prevPolygon = centrosEducativosPolygons[activeCentroEducativoId];
        if (prevPolygon) {
            prevPolygon.set('active', false);
            prevPolygon.changed();
        }
        const prevMarker = centrosEducativosMarkers[activeCentroEducativoId];
        if (prevMarker) {
            prevMarker.set('active', false);
            prevMarker.changed();
        }
    }
    
    const polygon = centrosEducativosPolygons[centroId];
    if (polygon) {
        polygon.set('active', true);
        polygon.changed();
    }
    
    const marker = centrosEducativosMarkers[centroId];
    if (marker) {
        marker.set('active', true);
        marker.changed();
    }
    
    activeCentroEducativoId = centroId;
    
    const centro = gestorCentrosEducativos.getCentro(centroId);
    if (centro && centro.area && centro.area.length > 0) {
        const coords = centro.area.map(c => ol.proj.fromLonLat(c));
        const center = calcularCentroPoligono(coords);
        map.getView().animate({
            center: center,
            zoom: 17,
            duration: 800
        });
    }
    
    if (mostrarPoligono && centroEducativoPolygonLayer) {
        centroEducativoPolygonLayer.setVisible(true);
    } else {
        if (centroEducativoPolygonLayer) {
            centroEducativoPolygonLayer.setVisible(false);
        }
    }
}

// ============================================
// REFRESCAR CENTROS EDUCATIVOS
// ============================================
function refrescarCentrosEducativos() {
    if (centroEducativoPolygonLayer) {
        centroEducativoPolygonLayer.getSource().clear();
    }
    if (centroEducativoMarkerLayer) {
        centroEducativoMarkerLayer.getSource().clear();
    }
    centrosEducativosPolygons = {};
    centrosEducativosMarkers = {};
    
    const centros = gestorCentrosEducativos.getTodosCentros();
    Object.keys(centros).forEach(centroId => {
        crearFeatureCentroEducativo(centroId, centros[centroId]);
    });
}

// ============================================
// MOSTRAR/OCULTAR CENTROS EDUCATIVOS
// ============================================
function toggleCentrosEducativos() {
    centrosEducativosVisibles = !centrosEducativosVisibles;
    
    if (centroEducativoPolygonLayer) {
        centroEducativoPolygonLayer.setVisible(centrosEducativosVisibles);
    }
    if (centroEducativoMarkerLayer) {
        centroEducativoMarkerLayer.setVisible(centrosEducativosVisibles);
    }
    
    const btn = document.getElementById('toggleCentrosEducativosBtn');
    if (btn) {
        if (centrosEducativosVisibles) {
            btn.classList.remove('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                Colegios
            `;
            btn.title = 'Ocultar centros educativos';
        } else {
            btn.classList.add('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                Mostrar
            `;
            btn.title = 'Mostrar centros educativos';
        }
    }
    
    console.log(`🏫 Centros educativos ${centrosEducativosVisibles ? 'visible' : 'oculto'}`);
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventosCentrosEducativos() {
    map.on('click', function(evt) {
        const features = map.getFeaturesAtPixel(evt.pixel, {
            hitTolerance: 15,
            layers: [centroEducativoMarkerLayer]
        });
        
        if (features && features.length > 0) {
            const feature = features[0];
            const centroId = feature.get('centroId');
            if (centroId) {
                console.log(`🏫 Click en centro educativo: ${centroId}`);
                activarCentroEducativo(centroId);
                abrirModalCentroEducativo(centroId);
            }
        }
    });
    
    map.on('pointermove', function(evt) {
        const pixel = map.getEventPixel(evt.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel, {
            hitTolerance: 15,
            layers: [centroEducativoMarkerLayer]
        });
        
        const targetId = map.getTarget();
        const targetElement = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        if (targetElement) {
            targetElement.style.cursor = hit ? 'pointer' : 'default';
        }
    });
    
    const closeBtn = document.getElementById('centroEducativoModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModalCentroEducativo);
    }
    
    const modal = document.getElementById('centroEducativoModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalCentroEducativo();
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('centroEducativoModal');
            if (modal && modal.classList.contains('active')) {
                cerrarModalCentroEducativo();
            }
        }
    });
    
    const toggleBtn = document.getElementById('toggleCentrosEducativosBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleCentrosEducativos);
    }
    
    map.getView().on('change:resolution', function() {
        if (centroEducativoMarkerLayer) {
            centroEducativoMarkerLayer.changed();
        }
    });
    
    console.log('✅ Eventos de centros educativos configurados correctamente');
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        inicializarCentrosEducativos();
    }, 1100);
});