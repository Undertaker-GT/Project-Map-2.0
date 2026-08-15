// ============================================
// SALONES DE EVENTOS - VERSIÓN OPTIMIZADA PARA MÓVILES
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
    console.log('🏡 Inicializando sistema de salones de eventos (modo optimizado)...');
    
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
    // Capa para polígonos - OCULTA POR DEFECTO
    salonPolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FF6B35';
            return crearEstiloPoligonoSalon(isActive, color);
        },
        visible: false
    });
    map.addLayer(salonPolygonLayer);
    
    // Capa para marcadores - SOLO EMOJI (sin círculo)
    salonMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const salonId = feature.get('salonId');
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FF6B35';
            const emoji = feature.get('emoji') || '🏡';
            const salonData = feature.get('salonData');
            return crearEstiloMarcadorSalon(salonId, isActive, color, emoji, salonData);
        },
        updateWhileAnimating: true,
        updateWhileInteracting: true
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
            color: salon.color || '#FF6B35'
        });
        salonPolygonLayer.getSource().addFeature(polygonFeature);
        salonesPolygons[salonId] = polygonFeature;
        
        // Crear marcador - SIN CÍRCULO, SOLO EMOJI + NOMBRE
        const markerCoords = salon.iconCoords ? 
            ol.proj.fromLonLat(salon.iconCoords) : 
            ol.proj.fromLonLat(salon.coords);
        
        const markerFeature = new ol.Feature({
            geometry: new ol.geom.Point(markerCoords),
            salonId: salonId,
            active: false,
            color: salon.color || '#FF6B35',
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
function crearEstiloPoligonoSalon(active = false, color = '#FF6B35') {
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
function crearEstiloMarcadorSalon(salonId, active = false, color = '#FF6B35', emoji = '🏡', salonData = null) {
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
    let nombreMostrar = salonId;
    if (salonData && salonData.nombre) {
        nombreMostrar = salonData.nombre.length > 12 ? 
            salonData.nombre.substring(0, 10) + '…' : 
            salonData.nombre;
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
// ABRIR MODAL DE SALÓN
// ============================================
function abrirModalSalon(salonId) {
    const salon = gestorSalonesEventos.getSalon(salonId);
    if (!salon) {
        console.warn(`⚠️ Salón ${salonId} no encontrado`);
        return;
    }
    
    activeSalonId = salonId;
    
    const titulo = document.getElementById('salonTitulo');
    if (titulo) {
        titulo.textContent = salon.emoji + ' ' + (salon.nombre || 'Salón de Eventos');
    }
    
    const lista = document.getElementById('listaSalones');
    if (!lista) return;
    
    lista.innerHTML = '';
    
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
                ${salon.capacidad ? `<p class="salon-capacidad">👥 Capacidad: ${salon.capacidad} personas</p>` : ''}
                ${salon.direccion ? `<p class="salon-dir">📍 ${salon.direccion}</p>` : ''}
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
            
            const routeLayer = new ol.layer.Vector({
                source: new ol.source.Vector(),
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#FF6B35',
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
                            color: '#FF6B35'
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
                if (salonPolygonLayer) {
                    salonPolygonLayer.setVisible(false);
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
// ACTIVAR SALÓN
// ============================================
function activarSalon(salonId, mostrarPoligono = false) {
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
    } else {
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
    
    const closeBtn = document.getElementById('salonModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModalSalon);
    }
    
    const modal = document.getElementById('salonModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalSalon();
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('salonModal');
            if (modal && modal.classList.contains('active')) {
                cerrarModalSalon();
            }
        }
    });
    
    const toggleBtn = document.getElementById('toggleSalonesBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSalones);
    }
    
    map.getView().on('change:resolution', function() {
        if (salonMarkerLayer) {
            salonMarkerLayer.changed();
        }
    });
    
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