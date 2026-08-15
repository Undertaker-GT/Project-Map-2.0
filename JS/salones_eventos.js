// ============================================
// SALONES DE EVENTOS - VERSIÓN OPENLAYERS
// ============================================

// Variables globales
let salonesMarkers = {};
let salonesPolygons = {};
let activeSalonId = null;
let salonesVisibles = true;

// Capas para salones
let salonPolygonLayer = null;
let salonMarkerLayer = null;

// ============================================
// INICIALIZAR SALONES DE EVENTOS
// ============================================
async function inicializarSalonesEventos() {
    console.log('🏡 Inicializando sistema de salones de eventos...');
    
    await gestorSalonesEventos.cargarDatos();
    
    const salones = gestorSalonesEventos.getTodosSalones();
    console.log(`📊 ${Object.keys(salones).length} salones disponibles`);
    
    crearCapasSalones();
    
    Object.keys(salones).forEach(salonId => {
        const salon = salones[salonId];
        crearFeatureSalon(salonId, salon);
    });
    
    configurarEventosSalones();
    
    gestorSalonesEventos.onCambio(() => {
        console.log('🔄 Datos de salones actualizados, refrescando...');
        refrescarSalones();
    });
    
    console.log('✅ Sistema de salones inicializado correctamente');
}

// ============================================
// CREAR CAPAS DE SALONES
// ============================================
function crearCapasSalones() {
    // Capa para polígonos
    salonPolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FF4500';
            return crearEstiloPoligonoSalon(isActive, color);
        },
        visible: false
    });
    map.addLayer(salonPolygonLayer);
    
    // Capa para marcadores
    salonMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FF4500';
            const emoji = feature.get('emoji') || '🏡';
            return crearEstiloMarcadorSalon(isActive, color, emoji);
        }
    });
    map.addLayer(salonMarkerLayer);
}

// ============================================
// CREAR FEATURE DE SALÓN
// ============================================
function crearFeatureSalon(salonId, salon) {
    if (!salon.area || salon.area.length < 3) {
        console.warn(`⚠️ Salón ${salonId} sin área válida`);
        return;
    }
    
    try {
        // Crear polígono
        const polygonCoords = salon.area.map(coord => ol.proj.fromLonLat(coord));
        const polygon = new ol.geom.Polygon([polygonCoords]);
        
        const polygonFeature = new ol.Feature({
            geometry: polygon,
            salonId: salonId,
            active: false,
            color: salon.color || '#FF4500'
        });
        salonPolygonLayer.getSource().addFeature(polygonFeature);
        salonesPolygons[salonId] = polygonFeature;
        
        // Crear marcador (usar iconCoords si existe, si no coords)
        const markerCoords = salon.iconCoords ? 
            ol.proj.fromLonLat(salon.iconCoords) : 
            ol.proj.fromLonLat(salon.coords);
        
        const markerFeature = new ol.Feature({
            geometry: new ol.geom.Point(markerCoords),
            salonId: salonId,
            active: false,
            color: salon.color || '#FF4500',
            emoji: salon.emoji || '🏡',
            salonData: salon
        });
        
        salonMarkerLayer.getSource().addFeature(markerFeature);
        salonesMarkers[salonId] = markerFeature;
        
        console.log(`✅ Salón ${salonId} creado correctamente`);
    } catch (error) {
        console.error(`❌ Error creando salón ${salonId}:`, error);
    }
}

// ============================================
// ESTILOS DE SALONES
// ============================================
function crearEstiloPoligonoSalon(active = false, color = '#FF4500') {
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

function crearEstiloMarcadorSalon(active = false, color = '#FF4500', emoji = '🏡') {
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
// ABRIR MODAL DE SALÓN
// ============================================
function abrirModalSalon(salonId) {
    const salon = gestorSalonesEventos.getSalon(salonId);
    if (!salon) {
        console.warn(`⚠️ Salón ${salonId} no encontrado`);
        return;
    }
    
    activeSalonId = salonId;
    
    // Actualizar título
    const titulo = document.getElementById('salonTitulo');
    if (titulo) {
        titulo.textContent = salon.emoji + ' ' + (salon.nombre || 'Salón de Eventos');
    }
    
    // Generar contenido
    const lista = document.getElementById('listaSalones');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    // Fotos
    const fotosHTML = salon.fotos && salon.fotos.length > 0 ?
        salon.fotos.map(f => `<img src="${f}" alt="${salon.nombre}" onerror="this.style.display='none'">`).join('') :
        '<p style="color:#94a3b8;font-size:13px;padding:8px;">Sin imágenes disponibles</p>';
    
    const item = document.createElement('div');
    item.className = 'salon-card';
    item.innerHTML = `
        <div class="salon-carousel">
            ${fotosHTML}
        </div>
        <div class="salon-info">
            <div class="salon-detalles">
                <span class="salon-tipo">${salon.tipo || 'Salón de Eventos'}</span>
            </div>
            <button class="salon-btn" onclick="trazarRutaSalon('${salonId}')">
                <i class="fas fa-route"></i> Trazar ruta
            </button>
        </div>
    `;
    lista.appendChild(item);
    
    document.getElementById('salonModal').classList.add('active');
}

// ============================================
// CERRAR MODAL DE SALÓN
// ============================================
function cerrarModalSalon() {
    const modal = document.getElementById('salonModal');
    if (modal) {
        modal.classList.remove('active');
    }
    activeSalonId = null;
}

// ============================================
// RUTA AL SALÓN
// ============================================
function trazarRutaSalon(salonId) {
    const salon = gestorSalonesEventos.getSalon(salonId);
    if (!salon) return;
    
    cerrarModalSalon();
    activarSalon(salonId, true);
    
    console.log(`🧭 Ruta a ${salon.nombre}`);
    
    if (currentPosition) {
        try {
            const userCoords = ol.proj.fromLonLat([currentPosition.lon, currentPosition.lat]);
            const destinoCoords = ol.proj.fromLonLat(salon.coords);
            
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
// ACTIVAR SALÓN
// ============================================
function activarSalon(salonId) {
    // Desactivar salón anterior
    if (activeSalonId !== null) {
        const prevPolygon = salonesPolygons[activeSalonId];
        if (prevPolygon) {
            prevPolygon.set('active', false);
            prevPolygon.changed();
        }
        const prevMarker = salonesMarkers[activeSalonId];
        if (prevMarker) {
            prevMarker.set('active', false);
            prevMarker.changed();
        }
    }
    
    // Activar nuevo salón
    const polygon = salonesPolygons[salonId];
    if (polygon) {
        polygon.set('active', true);
        polygon.changed();
    }
    
    const marker = salonesMarkers[salonId];
    if (marker) {
        marker.set('active', true);
        marker.changed();
    }
    
    activeSalonId = salonId;
    
    // Centrar el mapa en el salón
    const salon = gestorSalonesEventos.getSalon(salonId);
    if (salon && salon.area && salon.area.length > 0) {
        const coords = salon.area.map(c => ol.proj.fromLonLat(c));
        const center = calcularCentroPoligono(coords);
        map.getView().animate({
            center: center,
            zoom: 17,
            duration: 800
        });
    }
    if (mostrarPoligono && salonPolygonLayer) {
        salonPolygonLayer.setVisible(true);
    } 
    else {
        if (salonPolygonLayer) {
            salonPolygonLayer.setVisible(false);
        }
    }
}

// ============================================
// REFRESCAR SALONES
// ============================================
function refrescarSalones() {
    if (salonPolygonLayer) {
        salonPolygonLayer.getSource().clear();
    }
    if (salonMarkerLayer) {
        salonMarkerLayer.getSource().clear();
    }
    salonesPolygons = {};
    salonesMarkers = {};
    
    const salones = gestorSalonesEventos.getTodosSalones();
    Object.keys(salones).forEach(salonId => {
        crearFeatureSalon(salonId, salones[salonId]);
    });
}

// ============================================
// MOSTRAR/OCULTAR SALONES
// ============================================
function toggleSalones() {
    salonesVisibles = !salonesVisibles;
    
    if (salonPolygonLayer) {
        salonPolygonLayer.setVisible(salonesVisibles);
    }
    if (salonMarkerLayer) {
        salonMarkerLayer.setVisible(salonesVisibles);
    }
    
    const btn = document.getElementById('toggleSalonesBtn');
    if (btn) {
        if (salonesVisibles) {
            btn.classList.remove('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                Salón
            `;
            btn.title = 'Ocultar salón de eventos';
        } else {
            btn.classList.add('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                Mostrar
            `;
            btn.title = 'Mostrar salón de eventos';
        }
    }
    
    console.log(`🏡 Salones ${salonesVisibles ? 'visible' : 'oculto'}`);
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventosSalones() {
    // Click en marcadores de salones
    map.on('click', function(evt) {
        const features = map.getFeaturesAtPixel(evt.pixel, {
            hitTolerance: 15,
            layers: [salonMarkerLayer]
        });
        
        if (features && features.length > 0) {
            const feature = features[0];
            const salonId = feature.get('salonId');
            if (salonId) {
                console.log(`🏡 Click en salón: ${salonId}`);
                activarSalon(salonId);
                abrirModalSalon(salonId);
            }
        }
    });
    
    // Hover para cambiar cursor
    map.on('pointermove', function(evt) {
        const pixel = map.getEventPixel(evt.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel, {
            hitTolerance: 15,
            layers: [salonMarkerLayer]
        });
        
        const targetId = map.getTarget();
        const targetElement = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        if (targetElement) {
            targetElement.style.cursor = hit ? 'pointer' : 'default';
        }
    });
    
    // === EVENTOS DEL MODAL DE SALONES ===
    // Botón de cerrar (X)
    const closeBtn = document.getElementById('salonModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModalSalon);
        console.log('✅ Evento cerrar modal salón configurado');
    }
    
    // Clic fuera del modal
    const modal = document.getElementById('salonModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalSalon();
            }
        });
        console.log('✅ Evento click fuera modal salón configurado');
    }
    
    // Cerrar con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('salonModal');
            if (modal && modal.classList.contains('active')) {
                cerrarModalSalon();
            }
        }
    });
    
    // Botón toggle salones
    const toggleBtn = document.getElementById('toggleSalonesBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSalones);
        console.log('✅ Evento toggle salones configurado');
    }
    
    console.log('✅ Eventos de salones configurados correctamente');
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        inicializarSalonesEventos();
    }, 1200);
});