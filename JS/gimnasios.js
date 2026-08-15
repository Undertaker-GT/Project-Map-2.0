// ============================================
// GIMNASIOS - VERSIÓN OPENLAYERS
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
    console.log('💪 Inicializando sistema de gimnasios...');
    
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
    // Capa para polígonos
    gimnasioPolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FF4500';
            return crearEstiloPoligonoGimnasio(isActive, color);
        },
        visible: false // ← OCULTO
    });
    map.addLayer(gimnasioPolygonLayer);
    
    // Capa para marcadores
    gimnasioMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FF4500';
            const emoji = feature.get('emoji') || '💪';
            return crearEstiloMarcadorGimnasio(isActive, color, emoji);
        }
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
        
        // Crear marcador (usar iconCoords si existe, si no coords)
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

function crearEstiloMarcadorGimnasio(active = false, color = '#FF4500', emoji = '💪') {
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
// ABRIR MODAL DE GIMNASIO
// ============================================
function abrirModalGimnasio(gimnasioId) {
    const gimnasio = gestorGimnasios.getGimnasio(gimnasioId);
    if (!gimnasio) {
        console.warn(`⚠️ Gimnasio ${gimnasioId} no encontrado`);
        return;
    }
    
    activeGimnasioId = gimnasioId;
    
    // Actualizar título
    const titulo = document.getElementById('gimnasioTitulo');
    if (titulo) {
        titulo.textContent = gimnasio.emoji + ' ' + (gimnasio.nombre || 'Gimnasio');
    }
    
    // Generar contenido
    const lista = document.getElementById('listaGimnasios');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    // Fotos
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
            
            // Mostrar línea de ruta
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
            
            // Mostrar marcador de destino
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
// ACTIVAR GIMNASIO
// ============================================
function activarGimnasio(gimnasioId) {
    // Desactivar gimnasio anterior
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
    
    // Activar nuevo gimnasio
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
    
    // Centrar el mapa en el gimnasio
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
    } 
    else {
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
    // Click en marcadores de gimnasios
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
    
    // Hover para cambiar cursor
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
    
    // === EVENTOS DEL MODAL DE GIMNASIOS ===
    // Botón de cerrar (X)
    const closeBtn = document.getElementById('gimnasioModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModalGimnasio);
        console.log('✅ Evento cerrar modal gimnasio configurado');
    }
    
    // Clic fuera del modal
    const modal = document.getElementById('gimnasioModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalGimnasio();
            }
        });
        console.log('✅ Evento click fuera modal gimnasio configurado');
    }
    
    // Cerrar con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('gimnasioModal');
            if (modal && modal.classList.contains('active')) {
                cerrarModalGimnasio();
            }
        }
    });
    
    // Botón toggle gimnasios
    const toggleBtn = document.getElementById('toggleGimnasiosBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleGimnasios);
        console.log('✅ Evento toggle gimnasios configurado');
    }
    
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