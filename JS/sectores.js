// ============================================
// SECTORES - VERSIÓN CON GESTOR JSON + LOCALSTORAGE
// ============================================

// Variables globales de sectores
let sectorMarkers = {};
let sectorPolygons = {};
let activeSectorId = null;
let sectorModalActivo = null;
let sectoresVisibles = true;

// Capas para sectores
let sectorPolygonLayer = null;
let sectorMarkerLayer = null;

// ============================================
// FUNCIÓN PARA INICIALIZAR SECTORES
// ============================================
async function inicializarSectores() {
    console.log('🏘️ Inicializando sistema de sectores...');
    
    // Cargar datos usando el gestor
    await gestorSectores.cargarDatos();
    
    const sectores = gestorSectores.getTodosSectores();
    console.log(`📊 ${Object.keys(sectores).length} sectores disponibles`);
    
    // Crear capas
    crearCapasSectores();
    
    // Crear marcadores y polígonos para cada sector
    Object.keys(sectores).forEach(sectorId => {
        const sector = sectores[sectorId];
        crearFeatureSector(sectorId, sector);
    });
    
    // Configurar eventos
    configurarEventosSectores();
    
    // Configurar callback para cambios en los datos
    gestorSectores.onCambio(() => {
        console.log('🔄 Datos de sectores actualizados, refrescando mapa...');
        refrescarSectores();
    });
    
    console.log('✅ Sistema de sectores inicializado correctamente');
}

// ============================================
// CREAR CAPAS DE SECTORES
// ============================================
function crearCapasSectores() {
    // Capa para polígonos - OCULTA POR DEFECTO
    sectorPolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#F5DEB3';
            return crearEstiloPoligonoSector(isActive, color);
        },
        visible: false // ← OCULTO POR DEFECTO
    });
    map.addLayer(sectorPolygonLayer);
    
    // Capa para marcadores - SIEMPRE VISIBLE
    sectorMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const sectorId = feature.get('sectorId');
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#F5DEB3';
            return crearEstiloMarcadorSector(sectorId, isActive, color);
        }
    });
    map.addLayer(sectorMarkerLayer);
}

// ============================================
// CREAR FEATURE DE SECTOR
// ============================================
function crearFeatureSector(sectorId, sector) {
    if (!sector.area || sector.area.length < 3) {
        console.warn(`⚠️ Sector ${sectorId} sin área válida`);
        return;
    }
    
    // Crear polígono
    const polygonCoords = sector.area.map(coord => ol.proj.fromLonLat(coord));
    const polygon = new ol.geom.Polygon([polygonCoords]);
    
    const polygonFeature = new ol.Feature({
        geometry: polygon,
        sectorId: sectorId,
        active: false,
        color: sector.color || '#F5DEB3'
    });
    sectorPolygonLayer.getSource().addFeature(polygonFeature);
    sectorPolygons[sectorId] = polygonFeature;
    
    // Crear marcador
    const markerCoords = sector.coords ? 
        ol.proj.fromLonLat(sector.coords) : 
        calcularCentroPoligono(polygonCoords);
    
    const markerFeature = new ol.Feature({
        geometry: new ol.geom.Point(markerCoords),
        sectorId: sectorId,
        active: false,
        color: sector.color || '#F5DEB3',
        sectorData: sector
    });
    
    sectorMarkerLayer.getSource().addFeature(markerFeature);
    sectorMarkers[sectorId] = markerFeature;
}

// ============================================
// ESTILOS DE SECTORES
// ============================================
function crearEstiloPoligonoSector(active = false, color = '#F5DEB3') {
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

function crearEstiloMarcadorSector(sectorId, active = false, color = '#F5DEB3') {
    const activeColor = active ? darkenHex(color, 30) : color;
    
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 20,
            fill: new ol.style.Fill({
                color: active ? activeColor : color
            }),
            stroke: new ol.style.Stroke({
                color: active ? darkenHex(color, 50) : '#C4A882',
                width: 2
            })
        }),
        text: new ol.style.Text({
            text: sectorId,
            font: 'bold 14px Arial',
            fill: new ol.style.Fill({
                color: active ? '#FFFFFF' : '#333333'
            }),
            textAlign: 'center',
            textBaseline: 'middle',
            offsetY: 0
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
// REFRESCAR SECTORES (CUANDO CAMBIAN DATOS)
// ============================================
function refrescarSectores() {
    // Limpiar capas
    sectorPolygonLayer.getSource().clear();
    sectorMarkerLayer.getSource().clear();
    
    // Limpiar referencias
    sectorPolygons = {};
    sectorMarkers = {};
    
    // Volver a crear features
    const sectores = gestorSectores.getTodosSectores();
    Object.keys(sectores).forEach(sectorId => {
        crearFeatureSector(sectorId, sectores[sectorId]);
    });
    
    // Si había un sector activo, reactivarlo
    if (activeSectorId) {
        const sector = gestorSectores.getSector(activeSectorId);
        if (sector) {
            activarSector(activeSectorId);
        } else {
            activeSectorId = null;
        }
    }
}

// ============================================
// ACTIVAR SECTOR
// ============================================
function activarSector(sectorId, mostrarPoligono = false) {
    console.log(`📍 Activando sector: ${sectorId}`);
    
    const sector = gestorSectores.getSector(sectorId);
    if (!sector) {
        console.warn(`⚠️ Sector ${sectorId} no encontrado`);
        return;
    }
    
    // Desactivar sector anterior
    if (activeSectorId !== null) {
        const prevPolygon = sectorPolygons[activeSectorId];
        if (prevPolygon) {
            prevPolygon.set('active', false);
            prevPolygon.changed();
        }
        const prevMarker = sectorMarkers[activeSectorId];
        if (prevMarker) {
            prevMarker.set('active', false);
            prevMarker.changed();
        }
    }
    
    // Activar nuevo sector
    const polygon = sectorPolygons[sectorId];
    if (polygon) {
        polygon.set('active', true);
        polygon.changed();
    }
    
    const marker = sectorMarkers[sectorId];
    if (marker) {
        marker.set('active', true);
        marker.changed();
    }
    
    activeSectorId = sectorId;
    
    // Mostrar polígono SOLO si se solicita
    if (mostrarPoligono && sectorPolygonLayer) {
        sectorPolygonLayer.setVisible(true);
        // Centrar el mapa en el sector
        if (sector.area && sector.area.length > 0) {
            const coords = sector.area.map(c => ol.proj.fromLonLat(c));
            const center = calcularCentroPoligono(coords);
            map.getView().animate({
                center: center,
                zoom: 17,
                duration: 800
            });
        }
    } else {
        // Ocultar polígono si no se solicita
        if (sectorPolygonLayer) {
            sectorPolygonLayer.setVisible(false);
        }
    }
}

// ============================================
// DESACTIVAR SECTOR
// ============================================
function desactivarSector() {
    if (activeSectorId !== null) {
        const polygon = sectorPolygons[activeSectorId];
        if (polygon) {
            polygon.set('active', false);
            polygon.changed();
        }
        const marker = sectorMarkers[activeSectorId];
        if (marker) {
            marker.set('active', false);
            marker.changed();
        }
        activeSectorId = null;
    }
}

// ============================================
// MOSTRAR/OCULTAR SECTORES
// ============================================
function toggleSectores() {
    sectoresVisibles = !sectoresVisibles;
    sectorMarkerLayer.setVisible(sectoresVisibles);
    // Los polígonos solo se muestran cuando se traza ruta
    // No los ocultamos aquí porque ya están ocultos por defecto
    // solo si están visibles y ocultamos sectores, los ocultamos también
    if (!sectoresVisibles && sectorPolygonLayer) {
        sectorPolygonLayer.setVisible(false);
    }
    
    const btn = document.getElementById('toggleSectoresBtn');
    if (sectoresVisibles) {
        btn.classList.remove('oculto');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
            </svg>
            Sectores
        `;
    } else {
        btn.classList.add('oculto');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
            </svg>
            Mostrar
        `;
    }
}

// ============================================
// MODAL DE SECTOR
// ============================================
function abrirModalSector(sectorId) {
    const sector = gestorSectores.getSector(sectorId);
    if (!sector) return;
    
    sectorModalActivo = sectorId;
    
    document.getElementById('sectorModalTitle').textContent = sector.name || `Sector ${sectorId}`;
    document.getElementById('sectorModal').classList.add('active');
}

function cerrarModalSector() {
    document.getElementById('sectorModal').classList.remove('active');
    sectorModalActivo = null;
}

// ============================================
// TRAZAR RUTA
// ============================================
function trazarRutaASector(sectorId) {
    const sector = gestorSectores.getSector(sectorId);
    if (!sector) return;
    
    console.log(`🧭 Trazando ruta al sector ${sectorId}`);
    
    // Activar sector Y mostrar polígono
    activarSector(sectorId, true);
    
    if (currentPosition) {
        const userCoords = ol.proj.fromLonLat([currentPosition.lon, currentPosition.lat]);
        const sectorCenter = ol.proj.fromLonLat(sector.coords || sector.area[0]);
        
        // Crear línea de ruta
        const routeLayer = new ol.layer.Vector({
            source: new ol.source.Vector(),
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#4285F4',
                    width: 4,
                    lineDash: [10, 5]
                })
            })
        });
        
        const routeFeature = new ol.Feature({
            geometry: new ol.geom.LineString([userCoords, sectorCenter])
        });
        
        routeLayer.getSource().addFeature(routeFeature);
        map.addLayer(routeLayer);
        
        // Ocultar polígono después de 8 segundos
        setTimeout(() => {
            if (sectorPolygonLayer) {
                sectorPolygonLayer.setVisible(false);
            }
            map.removeLayer(routeLayer);
        }, 8000);
    }
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventosSectores() {
    console.log('🔧 Configurando eventos de sectores...');
    
    // === Evento de click en el mapa ===
    map.on('click', function(evt) {
        console.log('🖱️ Click en el mapa en:', evt.pixel);
        
        // Buscar características en el pixel clickeado
        const features = map.getFeaturesAtPixel(evt.pixel, {
            hitTolerance: 15,
            layers: [sectorMarkerLayer]
        });
        
        console.log(`🔍 Features encontrados: ${features ? features.length : 0}`);
        
        if (features && features.length > 0) {
            const feature = features[0];
            const sectorId = feature.get('sectorId');
            
            if (sectorId) {
                console.log(`✅ Click en sector: ${sectorId}`);
                // Activar sector SIN mostrar polígono
                activarSector(sectorId, false);
                abrirModalSector(sectorId);
            }
        }
    });
    
    // === Hover para cambiar cursor ===
    map.on('pointermove', function(evt) {
        const pixel = map.getEventPixel(evt.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel, {
            hitTolerance: 15,
            layers: [sectorMarkerLayer]
        });
        
        // === CORREGIDO: Obtener el elemento target correctamente ===
        const targetId = map.getTarget();
        const targetElement = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        
        if (targetElement) {
            targetElement.style.cursor = hit ? 'pointer' : 'default';
        }
    });
    
    // === Eventos del modal ===
    const modalClose = document.getElementById('sectorModalClose');
    if (modalClose) {
        modalClose.addEventListener('click', cerrarModalSector);
        console.log('✅ Evento close modal configurado');
    }
    
    const modal = document.getElementById('sectorModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalSector();
            }
        });
        console.log('✅ Evento click fuera modal configurado');
    }
    
    // === Botón de ruta ===
    const rutaBtn = document.getElementById('sectorRutaBtn');
    if (rutaBtn) {
        rutaBtn.addEventListener('click', function() {
            if (!sectorModalActivo) {
                console.warn('⚠️ No hay sector activo');
                return;
            }
            
            if (!currentPosition) {
                alert('Esperando ubicación actual...');
                return;
            }
            
            const houseInput = document.getElementById('sectorHouseInput').value;
            console.log(`🏠 Casa #${houseInput} en sector ${sectorModalActivo}`);
            
            cerrarModalSector();
            trazarRutaASector(sectorModalActivo);
        });
        console.log('✅ Evento ruta configurado');
    }
    
    // === Botón toggle sectores ===
    const toggleBtn = document.getElementById('toggleSectoresBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSectores);
        console.log('✅ Evento toggle sectores configurado');
    }
    
    console.log('✅ Eventos de sectores configurados correctamente');
}

// ============================================
// FUNCIÓN DE DEBUG PARA VERIFICAR CLICS
// ============================================
function verificarClicsEnSectores() {
    console.log('=== VERIFICANDO SECTORES ===');
    console.log('Sectores cargados:', Object.keys(sectorMarkers));
    console.log('Capa marcadores visible:', sectorMarkerLayer?.getVisible());
    console.log('Capa marcadores:', sectorMarkerLayer);
    
    // Agregar un overlay temporal para probar
    const overlay = new ol.Overlay({
        position: ol.proj.fromLonLat([-90.682780, 14.411844]),
        positioning: 'center-center',
        element: document.createElement('div'),
        stopEvent: false
    });
    
    const div = overlay.getElement();
    div.style.background = 'rgba(255,0,0,0.5)';
    div.style.color = 'white';
    div.style.padding = '10px';
    div.style.borderRadius = '5px';
    div.style.fontSize = '14px';
    div.textContent = '🔴 TEST';
    map.addOverlay(overlay);
    
    setTimeout(() => {
        map.removeOverlay(overlay);
    }, 3000);
}

// Exponer función de debug
window.verificarClicsEnSectores = verificarClicsEnSectores;

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        inicializarSectores();
    }, 500);
});