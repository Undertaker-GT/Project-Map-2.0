// ============================================
// GASOLINERAS - VERSIÓN OPENLAYERS
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
    console.log('⛽ Inicializando sistema de gasolineras...');
    
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
    // Capa para marcadores
    gasolineraMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const emoji = feature.get('emoji') || '⛽';
            return crearEstiloMarcadorGasolinera(emoji);
        }
    });
    map.addLayer(gasolineraMarkerLayer);
}

// ============================================
// CREAR FEATURE DE GASOLINERA
// ============================================
function crearFeatureGasolinera(gasolineraId, gasolinera) {
    try {
        // Crear marcador
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
// ESTILOS DE GASOLINERAS
// ============================================
function crearEstiloMarcadorGasolinera(emoji = '⛽') {
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 22,
            fill: new ol.style.Fill({
                color: '#2563eb'
            }),
            stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 3
            })
        }),
        text: new ol.style.Text({
            text: emoji,
            font: '20px Arial',
            textAlign: 'center',
            textBaseline: 'middle',
            offsetY: 0
        })
    });
}

// ============================================
// VERIFICAR SI LA GASOLINERA ESTÁ ABIERTA
// ============================================
function estaAbierto(horario) {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    
    if (horario.apertura < horario.cierre) {
        return horaActual >= horario.apertura && horaActual < horario.cierre;
    } else {
        return horaActual >= horario.apertura || horaActual < horario.cierre;
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
    overlayElement.style.left = (pixel[0] - 160) + 'px';
    overlayElement.style.top = (pixel[1] - 180) + 'px';
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
            btn.title = 'Ocultar gasolinera';
        } else {
            btn.classList.add('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                Mostrar
            `;
            btn.title = 'Mostrar gasolinera';
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
        console.log('✅ Evento toggle gasolineras configurado');
    }
    
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