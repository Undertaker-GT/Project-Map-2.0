// ============================================
// CENTROS EDUCATIVOS - VERSIÓN OPENLAYERS
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
    console.log('🏫 Inicializando sistema de centros educativos...');
    
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
    // Capa para polígonos
    centroEducativoPolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#3B5998';
            return crearEstiloPoligonoCentroEducativo(isActive, color);
        },
        visible: false // ← OCULTO
    });
    map.addLayer(centroEducativoPolygonLayer);
    
    // Capa para marcadores
    centroEducativoMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#3B5998';
            const emoji = feature.get('emoji') || '🏫';
            return crearEstiloMarcadorCentroEducativo(isActive, color, emoji);
        }
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
        
        // Crear marcador (usar iconCoords si existe, si no coords)
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

function crearEstiloMarcadorCentroEducativo(active = false, color = '#3B5998', emoji = '🏫') {
    const activeColor = active ? darkenHex(color, 30) : color;
    
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 22,
            fill: new ol.style.Fill({
                color: active ? activeColor : color
            }),
            stroke: new ol.style.Stroke({
                color: active ? darkenHex(color, 50) : '#C4A882',
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
// ABRIR MODAL DE CENTRO EDUCATIVO
// ============================================
function abrirModalCentroEducativo(centroId) {
    const centro = gestorCentrosEducativos.getCentro(centroId);
    if (!centro) {
        console.warn(`⚠️ Centro educativo ${centroId} no encontrado`);
        return;
    }
    
    activeCentroEducativoId = centroId;
    
    // Actualizar título
    const titulo = document.getElementById('centroEducativoTitulo');
    if (titulo) {
        titulo.textContent = centro.emoji + ' ' + (centro.nombre || 'Centro Educativo');
    }
    
    // Generar contenido
    const lista = document.getElementById('listaCentrosEducativos');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    // Fotos
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
                <span class="centro-educativo-tipo">Institución educativa</span>
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
            
            // Mostrar línea de ruta
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
            
            // Mostrar marcador de destino
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
// ACTIVAR CENTRO EDUCATIVO
// ============================================
function activarCentroEducativo(centroId) {
    // Desactivar centro anterior
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
    
    // Activar nuevo centro
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
    
    // Centrar el mapa en el centro
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
    } 
    else {
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
    // Click en marcadores de centros educativos
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
    
    // Hover para cambiar cursor
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
    
    // === EVENTOS DEL MODAL DE CENTROS EDUCATIVOS ===
    // Botón de cerrar (X)
    const closeBtn = document.getElementById('centroEducativoModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModalCentroEducativo);
        console.log('✅ Evento cerrar modal centros educativos configurado');
    }
    
    // Clic fuera del modal
    const modal = document.getElementById('centroEducativoModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalCentroEducativo();
            }
        });
        console.log('✅ Evento click fuera modal centros educativos configurado');
    }
    
    // Cerrar con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('centroEducativoModal');
            if (modal && modal.classList.contains('active')) {
                cerrarModalCentroEducativo();
            }
        }
    });
    
    // Botón toggle centros educativos
    const toggleBtn = document.getElementById('toggleCentrosEducativosBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleCentrosEducativos);
        console.log('✅ Evento toggle centros educativos configurado');
    }
    
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