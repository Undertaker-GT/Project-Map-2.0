// ============================================
// COMERCIOS - VERSIÓN OPTIMIZADA PARA MÓVILES
// ============================================

// Variables globales
let centrosMarkers = {};
let centrosPolygons = {};
let activeCentroId = null;
let centrosVisibles = true;

// Capas para comercios
let centroPolygonLayer = null;
let centroMarkerLayer = null;

// ============================================
// INICIALIZAR COMERCIOS
// ============================================
async function inicializarComercios() {
    console.log('🛍️ Inicializando sistema de comercios (modo optimizado)...');
    
    await gestorComercios.cargarDatos();
    
    const centros = gestorComercios.getTodosCentros();
    console.log(`📊 ${Object.keys(centros).length} centros comerciales disponibles`);
    
    crearCapasComercios();
    
    Object.keys(centros).forEach(centroId => {
        const centro = centros[centroId];
        crearFeatureCentro(centroId, centro);
    });
    
    configurarEventosComercios();
    
    gestorComercios.onCambio(() => {
        console.log('🔄 Datos de comercios actualizados, refrescando...');
        refrescarComercios();
    });
    
    console.log('✅ Sistema de comercios inicializado correctamente');
}

// ============================================
// CREAR CAPAS DE COMERCIOS
// ============================================
function crearCapasComercios() {
    // Capa para polígonos - OCULTA POR DEFECTO
    centroPolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#f59e0b';
            return crearEstiloPoligonoCentro(isActive, color);
        },
        visible: false
    });
    map.addLayer(centroPolygonLayer);
    
    // Capa para marcadores - SOLO EMOJI (sin círculo)
    centroMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const centroId = feature.get('centroId');
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#f59e0b';
            const centroData = feature.get('centroData');
            return crearEstiloMarcadorCentro(centroId, isActive, color, centroData);
        },
        updateWhileAnimating: true, // Mejora rendimiento en móviles
        updateWhileInteracting: true
    });
    map.addLayer(centroMarkerLayer);
}

// ============================================
// CREAR FEATURE DE CENTRO COMERCIAL
// ============================================
function crearFeatureCentro(centroId, centro) {
    if (!centro.area || centro.area.length < 3) {
        console.warn(`⚠️ Centro ${centroId} sin área válida`);
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
            color: centro.color || '#f59e0b'
        });
        centroPolygonLayer.getSource().addFeature(polygonFeature);
        centrosPolygons[centroId] = polygonFeature;
        
        // Crear marcador - SIN CÍRCULO, SOLO EMOJI + NOMBRE
        const markerCoords = ol.proj.fromLonLat(centro.coords);
        
        const markerFeature = new ol.Feature({
            geometry: new ol.geom.Point(markerCoords),
            centroId: centroId,
            active: false,
            color: centro.color || '#f59e0b',
            centroData: centro
        });
        
        centroMarkerLayer.getSource().addFeature(markerFeature);
        centrosMarkers[centroId] = markerFeature;
    } catch (error) {
        console.error(`❌ Error creando centro ${centroId}:`, error);
    }
}

// ============================================
// ESTILOS DE COMERCIOS
// ============================================
function crearEstiloPoligonoCentro(active = false, color = '#f59e0b') {
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
function crearEstiloMarcadorCentro(centroId, active = false, color = '#f59e0b', centroData = null) {
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
    //const displayText = `🛍️`;
    
    // Opción 2: Solo emoji (más limpio)
    // const displayText = '🛍️';
    
    // Opción 3: Emoji + nombre corto en 2 líneas
    const displayText = `🛍️\n${nombreMostrar}`;
    
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
// ABRIR MODAL DE CENTRO COMERCIAL
// ============================================
function abrirModalCentro(centroId) {
    const centro = gestorComercios.getCentro(centroId);
    if (!centro) {
        console.warn(`⚠️ Centro ${centroId} no encontrado`);
        return;
    }
    
    activeCentroId = centroId;
    
    // Actualizar título
    const titulo = document.getElementById('centroTitulo');
    if (titulo) {
        titulo.textContent = centro.nombre || centroId;
    }
    
    // Generar lista de comercios
    const lista = document.getElementById('listaComercios');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    if (!centro.comercios || centro.comercios.length === 0) {
        lista.innerHTML = '<p style="text-align:center;color:#64748b;padding:20px;">No hay comercios registrados en esta zona</p>';
        document.getElementById('centroModal').classList.add('active');
        return;
    }
    
    centro.comercios.forEach((comercio, index) => {
        const fotosHTML = comercio.fotos && comercio.fotos.length > 0 ? 
            comercio.fotos.map(f => `<img src="${f}" alt="${comercio.nombre}" onerror="this.style.display='none'">`).join('') : 
            '<p style="color:#94a3b8;font-size:13px;padding:8px;">Sin imágenes</p>';
        
        const item = document.createElement('div');
        item.className = 'comercio-card';
        item.innerHTML = `
            <div class="comercio-carousel">
                ${fotosHTML}
            </div>
            <div class="comercio-info">
                <h4>${comercio.nombre || 'Sin nombre'}</h4>
                <div class="comercio-datos">
                    <div>
                        <i class="fas fa-phone"></i>
                        ${comercio.telefono || 'No disponible'}
                    </div>
                    <div>
                        <i class="fas fa-clock"></i>
                        ${comercio.horario || 'Horario no disponible'}
                    </div>
                </div>
                <button onclick="rutaComercio('${centroId}', ${index})">
                    <i class="fas fa-route"></i> Ir
                </button>
            </div>
        `;
        lista.appendChild(item);
    });
    
    document.getElementById('centroModal').classList.add('active');
}

// ============================================
// CERRAR MODAL DE CENTRO COMERCIAL
// ============================================
function cerrarModalCentro() {
    const modal = document.getElementById('centroModal');
    if (modal) {
        modal.classList.remove('active');
    }
    activeCentroId = null;
}

// ============================================
// RUTA AL COMERCIO
// ============================================
function rutaComercio(centroId, comercioIndex) {
    const centro = gestorComercios.getCentro(centroId);
    if (!centro) return;
    
    const comercio = centro.comercios[comercioIndex];
    if (!comercio) return;
    
    cerrarModalCentro();
    
    // Activar centro Y mostrar polígono
    activarCentro(centroId, true);
    
    console.log(`🧭 Ruta a ${comercio.nombre} en ${centro.nombre}`);
    
    if (currentPosition) {
        try {
            const userCoords = ol.proj.fromLonLat([currentPosition.lon, currentPosition.lat]);
            const destinoCoords = ol.proj.fromLonLat(comercio.coords);
            
            // Mostrar línea de ruta
            const routeLayer = new ol.layer.Vector({
                source: new ol.source.Vector(),
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#f59e0b',
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
                            color: '#f59e0b'
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
            
            // Eliminar ruta y ocultar polígono después de 10 segundos
            setTimeout(() => {
                map.removeLayer(routeLayer);
                map.removeLayer(destMarkerLayer);
                if (centroPolygonLayer) {
                    centroPolygonLayer.setVisible(false);
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
// ACTIVAR CENTRO COMERCIAL
// ============================================
function activarCentro(centroId, mostrarPoligono = false) {
    // Desactivar centro anterior
    if (activeCentroId !== null) {
        const prevPolygon = centrosPolygons[activeCentroId];
        if (prevPolygon) {
            prevPolygon.set('active', false);
            prevPolygon.changed();
        }
        const prevMarker = centrosMarkers[activeCentroId];
        if (prevMarker) {
            prevMarker.set('active', false);
            prevMarker.changed();
        }
    }
    
    // Activar nuevo centro
    const polygon = centrosPolygons[centroId];
    if (polygon) {
        polygon.set('active', true);
        polygon.changed();
    }
    
    const marker = centrosMarkers[centroId];
    if (marker) {
        marker.set('active', true);
        marker.changed();
    }
    
    activeCentroId = centroId;
    
    // Mostrar polígono SOLO si se solicita
    if (mostrarPoligono && centroPolygonLayer) {
        centroPolygonLayer.setVisible(true);
    } else {
        if (centroPolygonLayer) {
            centroPolygonLayer.setVisible(false);
        }
    }
}

// ============================================
// REFRESCAR COMERCIOS
// ============================================
function refrescarComercios() {
    if (centroPolygonLayer) {
        centroPolygonLayer.getSource().clear();
    }
    if (centroMarkerLayer) {
        centroMarkerLayer.getSource().clear();
    }
    centrosPolygons = {};
    centrosMarkers = {};
    
    const centros = gestorComercios.getTodosCentros();
    Object.keys(centros).forEach(centroId => {
        crearFeatureCentro(centroId, centros[centroId]);
    });
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventosComercios() {
    // Click en marcadores de centros comerciales
    map.on('click', function(evt) {
        const features = map.getFeaturesAtPixel(evt.pixel, {
            hitTolerance: 15,
            layers: [centroMarkerLayer]
        });
        
        if (features && features.length > 0) {
            const feature = features[0];
            const centroId = feature.get('centroId');
            if (centroId) {
                console.log(`🛍️ Click en centro comercial: ${centroId}`);
                activarCentro(centroId);
                abrirModalCentro(centroId);
            }
        }
    });
    
    // Hover para cambiar cursor
    map.on('pointermove', function(evt) {
        const pixel = map.getEventPixel(evt.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel, {
            hitTolerance: 15,
            layers: [centroMarkerLayer]
        });
        
        const targetId = map.getTarget();
        const targetElement = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        if (targetElement) {
            targetElement.style.cursor = hit ? 'pointer' : 'default';
        }
    });
    
    // === EVENTOS DEL MODAL DE COMERCIOS ===
    const closeBtn = document.getElementById('centroModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModalCentro);
    }
    
    const modal = document.getElementById('centroModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalCentro();
            }
        });
    }
    
    // Cerrar con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('centroModal');
            if (modal && modal.classList.contains('active')) {
                cerrarModalCentro();
            }
        }
    });
    
    // === BOTÓN TOGGLE COMERCIOS ===
    const toggleBtn = document.getElementById('toggleComerciosBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleComercios);
    }
    
    // === Actualizar estilos al hacer zoom ===
    map.getView().on('change:resolution', function() {
        if (centroMarkerLayer) {
            centroMarkerLayer.changed();
        }
    });
    
    console.log('✅ Eventos de comercios configurados correctamente');
}

// ============================================
// MOSTRAR/OCULTAR COMERCIOS
// ============================================
function toggleComercios() {
    centrosVisibles = !centrosVisibles;
    
    if (centroPolygonLayer) {
        centroPolygonLayer.setVisible(centrosVisibles);
    }
    if (centroMarkerLayer) {
        centroMarkerLayer.setVisible(centrosVisibles);
    }
    
    const btn = document.getElementById('toggleComerciosBtn');
    if (btn) {
        if (centrosVisibles) {
            btn.classList.remove('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                Comercios
            `;
            btn.title = 'Ocultar comercios';
        } else {
            btn.classList.add('oculto');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
                </svg>
                Mostrar
            `;
            btn.title = 'Mostrar comercios';
        }
    }
    
    console.log(`🛍️ Comercios ${centrosVisibles ? 'visible' : 'oculto'}`);
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        inicializarComercios();
    }, 800);
});