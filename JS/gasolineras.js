// ============================================
// GASOLINERAS - VERSIÓN OPTIMIZADA PARA MÓVILES
// ============================================

// Variables globales
let gasolinerasMarkers = {};
let gasolinerasVisibles = true;

// Capas para gasolineras
let gasolineraMarkerLayer = null;

// ============================================
// INICIALIZAR GASOLINERAS
// ============================================
async function inicializarGasolineras() {
    console.log('⛽ Inicializando sistema de gasolineras (modo optimizado)...');
    
    await gestorGasolineras.cargarDatos();
    
    const gasolineras = gestorGasolineras.getTodasGasolineras();
    console.log(`📊 ${Object.keys(gasolineras).length} gasolineras disponibles`);
    
    crearCapasGasolineras();
    
    Object.keys(gasolineras).forEach(gasolineraId => {
        const gasolinera = gasolineras[gasolineraId];
        crearFeatureGasolinera(gasolineraId, gasolinera);
    });
    
    configurarEventosGasolineras();
    
    gestorGasolineras.onCambio(() => {
        console.log('🔄 Datos de gasolineras actualizados, refrescando...');
        refrescarGasolineras();
    });
    
    console.log('✅ Sistema de gasolineras inicializado correctamente');
}

// ============================================
// CREAR CAPAS DE GASOLINERAS
// ============================================
function crearCapasGasolineras() {
    // Capa para marcadores - SOLO EMOJI (sin círculo)
    gasolineraMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const gasolineraId = feature.get('gasolineraId');
            const gasolineraData = feature.get('gasolineraData');
            const emoji = feature.get('emoji') || '⛽';
            return crearEstiloMarcadorGasolinera(gasolineraId, emoji, gasolineraData);
        },
        updateWhileAnimating: true,
        updateWhileInteracting: true
    });
    map.addLayer(gasolineraMarkerLayer);
}

// ============================================
// CREAR FEATURE DE GASOLINERA
// ============================================
function crearFeatureGasolinera(gasolineraId, gasolinera) {
    try {
        // Crear marcador - SIN CÍRCULO, SOLO EMOJI + NOMBRE
        const markerCoords = ol.proj.fromLonLat(gasolinera.coords);
        
        const markerFeature = new ol.Feature({
            geometry: new ol.geom.Point(markerCoords),
            gasolineraId: gasolineraId,
            emoji: gasolinera.emoji || '⛽',
            gasolineraData: gasolinera
        });
        
        gasolineraMarkerLayer.getSource().addFeature(markerFeature);
        gasolinerasMarkers[gasolineraId] = markerFeature;
        
        console.log(`✅ Gasolinera ${gasolineraId} creada correctamente`);
    } catch (error) {
        console.error(`❌ Error creando gasolinera ${gasolineraId}:`, error);
    }
}

// ============================================
// NUEVO ESTILO: EMOJI + NOMBRE SIN CÍRCULO
// ============================================
function crearEstiloMarcadorGasolinera(gasolineraId, emoji = '⛽', gasolineraData = null) {
    // Colores según estado
    const textColor = '#333333';
    const bgColor = 'transparent';
    
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
    let nombreMostrar = gasolineraId;
    if (gasolineraData && gasolineraData.nombre) {
        nombreMostrar = gasolineraData.nombre.length > 12 ? 
            gasolineraData.nombre.substring(0, 10) + '…' : 
            gasolineraData.nombre;
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
                color: 'rgba(255,255,255,0.9)',
                width: 2
            }),
            textAlign: 'center',
            textBaseline: 'middle',
            offsetY: 0,
            backgroundFill: new ol.style.Fill({
                color: bgColor
            }),
            backgroundStroke: new ol.style.Stroke({
                color: 'rgba(255,255,255,0.2)',
                width: 2
            }),
            padding: [padding, padding + 4, padding, padding + 4]
        })
    });
}

// ============================================
// VERIFICAR SI LA GASOLINERA ESTÁ ABIERTA
// ============================================
function estaAbierto(horario) {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutosActual = ahora.getMinutes();
    const horaCompleta = horaActual + (minutosActual / 60);
    
    if (horario.apertura < horario.cierre) {
        return horaCompleta >= horario.apertura && horaCompleta < horario.cierre;
    } else {
        return horaCompleta >= horario.apertura || horaCompleta < horario.cierre;
    }
}

// ============================================
// ABRIR POPUP DE GASOLINERA
// ============================================
function abrirPopupGasolinera(gasolineraId) {
    const gasolinera = gestorGasolineras.getGasolinera(gasolineraId);
    if (!gasolinera) {
        console.warn(`⚠️ Gasolinera ${gasolineraId} no encontrada`);
        return;
    }
    
    const abierta = estaAbierto(gasolinera.horario);
    const estadoClase = abierta ? 'abierto' : 'cerrado';
    const estadoTexto = abierta ? '🟢 Abierto ahora' : '🔴 Cerrado ahora';
    
    // Generar contenido del popup
    const popupContent = `
        <div class="gasolinera-popup">
            <div class="gasolinera-popup-header">
                <div class="gasolinera-icon">${gasolinera.emoji || '⛽'}</div>
                <div>
                    <h3>${gasolinera.nombre || 'Gasolinera'}</h3>
                    <span class="gasolinera-tipo">${gasolinera.tipo || 'Estación de servicio'}</span>
                </div>
            </div>
            <div class="gasolinera-status ${estadoClase}">
                ${estadoTexto}
            </div>
            <div class="gasolinera-horario">
                <i class="fas fa-clock"></i>
                <span>${gasolinera.horarioTexto || '5:00 AM - 11:00 PM'}</span>
            </div>
            <button class="gasolinera-btn" onclick="trazarRutaGasolinera('${gasolineraId}')">
                <i class="fas fa-route"></i> Trazar ruta
            </button>
        </div>
    `;
    
    // Crear overlay para el popup
    const overlayElement = document.createElement('div');
    overlayElement.className = 'gasolinera-popup-overlay';
    overlayElement.innerHTML = popupContent;
    
    // Eliminar popup anterior si existe
    const existingPopup = document.querySelector('.gasolinera-popup-overlay');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    document.body.appendChild(overlayElement);
    
    // Posicionar el popup en el mapa
    const coords = ol.proj.fromLonLat(gasolinera.coords);
    const pixel = map.getPixelFromCoordinate(coords);
    
    overlayElement.style.position = 'absolute';
    overlayElement.style.left = (pixel[0] - 180) + 'px';
    overlayElement.style.top = (pixel[1] - 200) + 'px';
    overlayElement.style.zIndex = '1000';
    
    // Guardar referencia al popup
    window._popupGasolinera = overlayElement;
    
    // Cerrar popup al hacer clic fuera
    setTimeout(() => {
        document.addEventListener('click', function cerrarPopup(e) {
            if (!overlayElement.contains(e.target)) {
                cerrarPopupGasolinera();
                document.removeEventListener('click', cerrarPopup);
            }
        });
    }, 100);
}

function cerrarPopupGasolinera() {
    const popup = document.querySelector('.gasolinera-popup-overlay');
    if (popup) {
        popup.remove();
    }
    window._popupGasolinera = null;
}

// ============================================
// RUTA A LA GASOLINERA
// ============================================
function trazarRutaGasolinera(gasolineraId) {
    const gasolinera = gestorGasolineras.getGasolinera(gasolineraId);
    if (!gasolinera) return;
    
    cerrarPopupGasolinera();
    
    console.log(`🧭 Ruta a ${gasolinera.nombre}`);
    
    if (currentPosition) {
        try {
            const userCoords = ol.proj.fromLonLat([currentPosition.lon, currentPosition.lat]);
            const destinoCoords = ol.proj.fromLonLat(gasolinera.coords);
            
            // Mostrar línea de ruta
            const routeLayer = new ol.layer.Vector({
                source: new ol.source.Vector(),
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#2563eb',
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
                            color: '#2563eb'
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
            }, 10000);
        } catch (error) {
            console.error('❌ Error al trazar ruta:', error);
        }
    } else {
        alert('No se pudo obtener tu ubicación actual. Activa el GPS e intenta de nuevo.');
    }
}

// ============================================
// REFRESCAR GASOLINERAS
// ============================================
function refrescarGasolineras() {
    if (gasolineraMarkerLayer) {
        gasolineraMarkerLayer.getSource().clear();
    }
    gasolinerasMarkers = {};
    
    const gasolineras = gestorGasolineras.getTodasGasolineras();
    Object.keys(gasolineras).forEach(gasolineraId => {
        crearFeatureGasolinera(gasolineraId, gasolineras[gasolineraId]);
    });
}

// ============================================
// MOSTRAR/OCULTAR GASOLINERAS
// ============================================
function toggleGasolineras() {
    gasolinerasVisibles = !gasolinerasVisibles;
    
    if (gasolineraMarkerLayer) {
        gasolineraMarkerLayer.setVisible(gasolinerasVisibles);
    }
    
    const btn = document.getElementById('toggleGasolinerasBtn');
    if (btn) {
        if (gasolinerasVisibles) {
            btn.classList.remove('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                Gasolina
            `;
            btn.title = 'Ocultar gasolineras';
        } else {
            btn.classList.add('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                Mostrar
            `;
            btn.title = 'Mostrar gasolineras';
        }
    }
    
    console.log(`⛽ Gasolineras ${gasolinerasVisibles ? 'visible' : 'oculto'}`);
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventosGasolineras() {
    // Click en marcadores de gasolineras
    map.on('click', function(evt) {
        const features = map.getFeaturesAtPixel(evt.pixel, {
            hitTolerance: 15,
            layers: [gasolineraMarkerLayer]
        });
        
        if (features && features.length > 0) {
            const feature = features[0];
            const gasolineraId = feature.get('gasolineraId');
            if (gasolineraId) {
                console.log(`⛽ Click en gasolinera: ${gasolineraId}`);
                abrirPopupGasolinera(gasolineraId);
            }
        }
    });
    
    // Hover para cambiar cursor
    map.on('pointermove', function(evt) {
        const pixel = map.getEventPixel(evt.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel, {
            hitTolerance: 15,
            layers: [gasolineraMarkerLayer]
        });
        
        const targetId = map.getTarget();
        const targetElement = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        if (targetElement) {
            targetElement.style.cursor = hit ? 'pointer' : 'default';
        }
    });
    
    // Cerrar popup con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            cerrarPopupGasolinera();
        }
    });
    
    // Botón toggle gasolineras
    const toggleBtn = document.getElementById('toggleGasolinerasBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleGasolineras);
    }
    
    // Actualizar estilos al hacer zoom
    map.getView().on('change:resolution', function() {
        if (gasolineraMarkerLayer) {
            gasolineraMarkerLayer.changed();
        }
    });
    
    console.log('✅ Eventos de gasolineras configurados correctamente');
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        inicializarGasolineras();
    }, 1400);
});