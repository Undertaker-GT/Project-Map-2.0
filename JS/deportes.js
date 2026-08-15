// ============================================
// DEPORTES - VERSIÓN OPENLAYERS
// ============================================

// Variables globales
let deportesMarkers = {};
let deportesPolygons = {};
let activeDeporteId = null;
let deportesVisibles = true;

// Capas para deportes
let deportePolygonLayer = null;
let deporteMarkerLayer = null;

// ============================================
// INICIALIZAR DEPORTES
// ============================================
async function inicializarDeportes() {
    console.log('🏟️ Inicializando sistema de centros deportivos...');
    
    await gestorDeportes.cargarDatos();
    
    const deportes = gestorDeportes.getTodosDeportes();
    console.log(`📊 ${Object.keys(deportes).length} centros deportivos disponibles`);
    
    crearCapasDeportes();
    
    Object.keys(deportes).forEach(deporteId => {
        const deporte = deportes[deporteId];
        crearFeatureDeporte(deporteId, deporte);
    });
    
    configurarEventosDeportes();
    
    gestorDeportes.onCambio(() => {
        console.log('🔄 Datos de deportes actualizados, refrescando...');
        refrescarDeportes();
    });
    
    console.log('✅ Sistema de deportes inicializado correctamente');
}

// ============================================
// CREAR CAPAS DE DEPORTES
// ============================================
function crearCapasDeportes() {
    // Capa para polígonos
    deportePolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#088729';
            return crearEstiloPoligonoDeporte(isActive, color);
        },
        visible: false
    });
    map.addLayer(deportePolygonLayer);
    
    // Capa para marcadores
    deporteMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#088729';
            const emoji = feature.get('emoji') || '🏟️';
            return crearEstiloMarcadorDeporte(isActive, color, emoji);
        }
    });
    map.addLayer(deporteMarkerLayer);
}

// ============================================
// CREAR FEATURE DE DEPORTE
// ============================================
function crearFeatureDeporte(deporteId, deporte) {
    if (!deporte.area || deporte.area.length < 3) {
        console.warn(`⚠️ Deporte ${deporteId} sin área válida`);
        return;
    }
    
    try {
        // Crear polígono
        const polygonCoords = deporte.area.map(coord => ol.proj.fromLonLat(coord));
        const polygon = new ol.geom.Polygon([polygonCoords]);
        
        const polygonFeature = new ol.Feature({
            geometry: polygon,
            deporteId: deporteId,
            active: false,
            color: deporte.color || '#088729'
        });
        deportePolygonLayer.getSource().addFeature(polygonFeature);
        deportesPolygons[deporteId] = polygonFeature;
        
        // Crear marcador (usar iconCoords si existe, si no coords)
        const markerCoords = deporte.iconCoords ? 
            ol.proj.fromLonLat(deporte.iconCoords) : 
            ol.proj.fromLonLat(deporte.coords);
        
        const markerFeature = new ol.Feature({
            geometry: new ol.geom.Point(markerCoords),
            deporteId: deporteId,
            active: false,
            color: deporte.color || '#088729',
            emoji: deporte.emoji || '🏟️',
            deporteData: deporte
        });
        
        deporteMarkerLayer.getSource().addFeature(markerFeature);
        deportesMarkers[deporteId] = markerFeature;
        
        console.log(`✅ Deporte ${deporteId} creado correctamente`);
    } catch (error) {
        console.error(`❌ Error creando deporte ${deporteId}:`, error);
    }
}

// ============================================
// ESTILOS DE DEPORTES
// ============================================
function crearEstiloPoligonoDeporte(active = false, color = '#088729') {
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

function crearEstiloMarcadorDeporte(active = false, color = '#088729', emoji = '🏟️') {
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
// ABRIR MODAL DE DEPORTE
// ============================================
function abrirModalDeporte(deporteId) {
    const deporte = gestorDeportes.getDeporte(deporteId);
    if (!deporte) {
        console.warn(`⚠️ Deporte ${deporteId} no encontrado`);
        return;
    }
    
    activeDeporteId = deporteId;
    
    // Actualizar título
    const titulo = document.getElementById('deporteTitulo');
    if (titulo) {
        titulo.textContent = deporte.emoji + ' ' + (deporte.nombre || 'Centro Deportivo');
    }
    
    // Generar lista de deportes (en este caso solo uno, pero mantengo la estructura)
    const lista = document.getElementById('listaDeportes');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    const fotosHTML = deporte.fotos && deporte.fotos.length > 0 ?
        deporte.fotos.map(f => `<img src="${f}" alt="${deporte.nombre}" onerror="this.style.display='none'">`).join('') :
        '<p style="color:#94a3b8;font-size:13px;padding:8px;">Sin imágenes disponibles</p>';
    
    const item = document.createElement('div');
    item.className = 'deporte-card';
    item.innerHTML = `
        <div class="deporte-carousel">
            ${fotosHTML}
        </div>
        <div class="deporte-info">
            <div class="deporte-tipo">${deporte.tipo || 'Zona Deportiva'}</div>
            <button onclick="trazarRutaADeporte('${deporteId}')">
                <i class="fas fa-route"></i> Trazar ruta
            </button>
        </div>
    `;
    lista.appendChild(item);
    
    document.getElementById('deporteModal').classList.add('active');
}

// ============================================
// CERRAR MODAL DE DEPORTE
// ============================================
function cerrarModalDeporte() {
    const modal = document.getElementById('deporteModal');
    if (modal) {
        modal.classList.remove('active');
    }
    activeDeporteId = null;
}

// ============================================
// RUTA AL DEPORTE
// ============================================
function trazarRutaADeporte(deporteId) {
    const deporte = gestorDeportes.getDeporte(deporteId);
    if (!deporte) return;
    
    cerrarModalDeporte();
    activarDeporte(deporteId, true);
    
    console.log(`🧭 Ruta a ${deporte.nombre}`);
    
    if (currentPosition) {
        try {
            const userCoords = ol.proj.fromLonLat([currentPosition.lon, currentPosition.lat]);
            const destinoCoords = ol.proj.fromLonLat(deporte.coords);
            
            // Mostrar línea de ruta
            const routeLayer = new ol.layer.Vector({
                source: new ol.source.Vector(),
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#088729',
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
                            color: '#088729'
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
// ACTIVAR DEPORTE
// ============================================
function activarDeporte(deporteId) {
    // Desactivar deporte anterior
    if (activeDeporteId !== null) {
        const prevPolygon = deportesPolygons[activeDeporteId];
        if (prevPolygon) {
            prevPolygon.set('active', false);
            prevPolygon.changed();
        }
        const prevMarker = deportesMarkers[activeDeporteId];
        if (prevMarker) {
            prevMarker.set('active', false);
            prevMarker.changed();
        }
    }
    
    // Activar nuevo deporte
    const polygon = deportesPolygons[deporteId];
    if (polygon) {
        polygon.set('active', true);
        polygon.changed();
    }
    
    const marker = deportesMarkers[deporteId];
    if (marker) {
        marker.set('active', true);
        marker.changed();
    }
    
    activeDeporteId = deporteId;
    
    // Centrar el mapa en el deporte
    const deporte = gestorDeportes.getDeporte(deporteId);
    if (deporte && deporte.area && deporte.area.length > 0) {
        const coords = deporte.area.map(c => ol.proj.fromLonLat(c));
        const center = calcularCentroPoligono(coords);
        map.getView().animate({
            center: center,
            zoom: 17,
            duration: 800
        });
    }
    if (mostrarPoligono && deportePolygonLayer) {
        deportePolygonLayer.setVisible(true);
    } 
    else {
        if (deportePolygonLayer) {
            deportePolygonLayer.setVisible(false);
        }
    }
    if (mostrarPoligono && deportePolygonLayer) {
        deportePolygonLayer.setVisible(true);
    } 
    else {
        if (deportePolygonLayer) {
            deportePolygonLayer.setVisible(false);
        }
    }
}

// ============================================
// REFRESCAR DEPORTES
// ============================================
function refrescarDeportes() {
    if (deportePolygonLayer) {
        deportePolygonLayer.getSource().clear();
    }
    if (deporteMarkerLayer) {
        deporteMarkerLayer.getSource().clear();
    }
    deportesPolygons = {};
    deportesMarkers = {};
    
    const deportes = gestorDeportes.getTodosDeportes();
    Object.keys(deportes).forEach(deporteId => {
        crearFeatureDeporte(deporteId, deportes[deporteId]);
    });
}

// ============================================
// MOSTRAR/OCULTAR DEPORTES
// ============================================
function toggleDeportes() {
    deportesVisibles = !deportesVisibles;
    
    if (deportePolygonLayer) {
        deportePolygonLayer.setVisible(deportesVisibles);
    }
    if (deporteMarkerLayer) {
        deporteMarkerLayer.setVisible(deportesVisibles);
    }
    
    const btn = document.getElementById('toggleDeportesBtn');
    if (btn) {
        if (deportesVisibles) {
            btn.classList.remove('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                Deportes
            `;
            btn.title = 'Ocultar deportes';
        } else {
            btn.classList.add('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                Mostrar
            `;
            btn.title = 'Mostrar deportes';
        }
    }
    
    console.log(`🏟️ Deportes ${deportesVisibles ? 'visible' : 'oculto'}`);
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventosDeportes() {
    // Click en marcadores de deportes
    map.on('click', function(evt) {
        const features = map.getFeaturesAtPixel(evt.pixel, {
            hitTolerance: 15,
            layers: [deporteMarkerLayer]
        });
        
        if (features && features.length > 0) {
            const feature = features[0];
            const deporteId = feature.get('deporteId');
            if (deporteId) {
                console.log(`🏟️ Click en centro deportivo: ${deporteId}`);
                activarDeporte(deporteId);
                abrirModalDeporte(deporteId);
            }
        }
    });
    
    // Hover para cambiar cursor
    map.on('pointermove', function(evt) {
        const pixel = map.getEventPixel(evt.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel, {
            hitTolerance: 15,
            layers: [deporteMarkerLayer]
        });
        
        const targetId = map.getTarget();
        const targetElement = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        if (targetElement) {
            targetElement.style.cursor = hit ? 'pointer' : 'default';
        }
    });
    
    // === EVENTOS DEL MODAL DE DEPORTES ===
    // Botón de cerrar (X)
    const closeBtn = document.getElementById('deporteModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModalDeporte);
        console.log('✅ Evento cerrar modal deportes configurado');
    }
    
    // Clic fuera del modal
    const modal = document.getElementById('deporteModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalDeporte();
            }
        });
        console.log('✅ Evento click fuera modal deportes configurado');
    }
    
    // Cerrar con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('deporteModal');
            if (modal && modal.classList.contains('active')) {
                cerrarModalDeporte();
            }
        }
    });
    
    // Botón toggle deportes
    const toggleBtn = document.getElementById('toggleDeportesBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleDeportes);
        console.log('✅ Evento toggle deportes configurado');
    }
    
    console.log('✅ Eventos de deportes configurados correctamente');
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        inicializarDeportes();
    }, 900);
});