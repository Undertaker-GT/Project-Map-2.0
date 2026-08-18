// ============================================
// ÁREAS INFANTILES - VERSIÓN CON OSRM
// ============================================

// Variables globales
let areasMarkers = {};
let areasPolygons = {};
let activeAreaId = null;
let areasVisibles = true;

// Capas para áreas infantiles
let areaPolygonLayer = null;
let areaMarkerLayer = null;

// ============================================
// INICIALIZAR ÁREAS INFANTILES
// ============================================
async function inicializarAreasInfantiles() {
    console.log('🛝 Inicializando sistema de áreas infantiles (modo optimizado)...');
    
    await gestorAreasInfantiles.cargarDatos();
    
    const areas = gestorAreasInfantiles.getTodasAreas();
    console.log(`📊 ${Object.keys(areas).length} áreas infantiles disponibles`);
    
    crearCapasAreas();
    
    Object.keys(areas).forEach(areaId => {
        const area = areas[areaId];
        crearFeatureArea(areaId, area);
    });
    
    configurarEventosAreas();
    
    gestorAreasInfantiles.onCambio(() => {
        console.log('🔄 Datos de áreas infantiles actualizados, refrescando...');
        refrescarAreas();
    });
    
    console.log('✅ Sistema de áreas infantiles inicializado correctamente');
}

// ============================================
// CREAR CAPAS DE ÁREAS INFANTILES
// ============================================
function crearCapasAreas() {
    // Capa para polígonos - OCULTA POR DEFECTO
    areaPolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FFD700';
            return crearEstiloPoligonoArea(isActive, color);
        },
        visible: false
    });
    map.addLayer(areaPolygonLayer);
    
    // Capa para marcadores - SOLO EMOJI (sin círculo)
    areaMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const areaId = feature.get('areaId');
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FFD700';
            const emoji = feature.get('emoji') || '🛝';
            const areaData = feature.get('areaData');
            return crearEstiloMarcadorArea(areaId, isActive, color, emoji, areaData);
        },
        updateWhileAnimating: true,
        updateWhileInteracting: true
    });
    map.addLayer(areaMarkerLayer);
}

// ============================================
// CREAR FEATURE DE ÁREA INFANTIL
// ============================================
function crearFeatureArea(areaId, area) {
    if (!area.area || area.area.length < 3) {
        console.warn(`⚠️ Área ${areaId} sin área válida`);
        return;
    }
    
    try {
        // Crear polígono
        const polygonCoords = area.area.map(coord => ol.proj.fromLonLat(coord));
        const polygon = new ol.geom.Polygon([polygonCoords]);
        
        const polygonFeature = new ol.Feature({
            geometry: polygon,
            areaId: areaId,
            active: false,
            color: area.color || '#FFD700'
        });
        areaPolygonLayer.getSource().addFeature(polygonFeature);
        areasPolygons[areaId] = polygonFeature;
        
        // Crear marcador
        const markerCoords = area.iconCoords ? 
            ol.proj.fromLonLat(area.iconCoords) : 
            ol.proj.fromLonLat(area.coords);
        
        const markerFeature = new ol.Feature({
            geometry: new ol.geom.Point(markerCoords),
            areaId: areaId,
            active: false,
            color: area.color || '#FFD700',
            emoji: area.emoji || '🛝',
            areaData: area
        });
        
        areaMarkerLayer.getSource().addFeature(markerFeature);
        areasMarkers[areaId] = markerFeature;
        
        console.log(`✅ Área ${areaId} creada correctamente`);
    } catch (error) {
        console.error(`❌ Error creando área ${areaId}:`, error);
    }
}

// ============================================
// ESTILOS DE ÁREAS INFANTILES
// ============================================
function crearEstiloPoligonoArea(active = false, color = '#FFD700') {
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

function crearEstiloMarcadorArea(areaId, active = false, color = '#FFD700', emoji = '🛝', areaData = null) {
    const textColor = active ? '#FFFFFF' : '#333333';
    const bgColor = active ? darkenHex(color, 30) : 'transparent';
    
    const zoom = map.getView().getZoom();
    let nameSize = 10;
    let padding = 3;
    
    if (zoom >= 18) {
        nameSize = 13;
        padding = 6;
    } else if (zoom >= 16) {
        nameSize = 11;
        padding = 5;
    } else if (zoom >= 14) {
        nameSize = 9;
        padding = 4;
    } else if (zoom >= 12) {
        nameSize = 8;
        padding = 3;
    } else {
        nameSize = 7;
        padding = 2;
    }
    
    const displayText = emoji;
    
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
// FUNCIONES DE UTILIDAD
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

function calcularCentroPoligono(coords) {
    let x = 0, y = 0;
    coords.forEach(coord => {
        x += coord[0];
        y += coord[1];
    });
    return [x / coords.length, y / coords.length];
}

// ============================================
// CERRAR MODAL DE ÁREA INFANTIL
// ============================================
function cerrarModalArea() {
    const modal = document.getElementById('areaModal');
    if (modal) {
        modal.classList.remove('active');
    }
    activeAreaId = null;
}

// ============================================
// ABRIR MODAL DE ÁREA INFANTIL
// ============================================
function abrirModalArea(areaId) {
    const area = gestorAreasInfantiles.getArea(areaId);
    if (!area) {
        console.warn(`⚠️ Área ${areaId} no encontrada`);
        return;
    }
    
    activeAreaId = areaId;
    
    const titulo = document.getElementById('areaTitulo');
    if (titulo) {
        titulo.textContent = area.emoji + ' ' + (area.nombre || 'Área Infantil');
    }
    
    const lista = document.getElementById('listaAreas');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    const item = document.createElement('div');
    item.className = 'area-card';
    item.innerHTML = `
        <div class="area-info">
            <div class="area-icono">${area.emoji || '🛝'}</div>
            <div class="area-detalles">
                <h4>${area.nombre || 'Área Infantil'}</h4>
                <span class="area-tipo">Zona de juegos</span>
            </div>
        </div>
        <button class="area-btn-ruta" onclick="trazarRutaArea('${areaId}')">
            <i class="fas fa-route"></i> Trazar ruta
        </button>
    `;
    lista.appendChild(item);
    
    document.getElementById('areaModal').classList.add('active');
}

// ============================================
// ACTIVAR ÁREA INFANTIL
// ============================================
function activarArea(areaId, mostrarPoligono = false) {
    // Desactivar área anterior
    if (activeAreaId !== null) {
        const prevPolygon = areasPolygons[activeAreaId];
        if (prevPolygon) {
            prevPolygon.set('active', false);
            prevPolygon.changed();
        }
        const prevMarker = areasMarkers[activeAreaId];
        if (prevMarker) {
            prevMarker.set('active', false);
            prevMarker.changed();
        }
    }
    
    // Activar nueva área
    const polygon = areasPolygons[areaId];
    if (polygon) {
        polygon.set('active', true);
        polygon.changed();
    }
    
    const marker = areasMarkers[areaId];
    if (marker) {
        marker.set('active', true);
        marker.changed();
    }
    
    activeAreaId = areaId;
    
    // Centrar el mapa en el área (solo si se muestra el polígono)
    if (mostrarPoligono) {
        const area = gestorAreasInfantiles.getArea(areaId);
        if (area && area.area && area.area.length > 0) {
            const coords = area.area.map(c => ol.proj.fromLonLat(c));
            const center = calcularCentroPoligono(coords);
            map.getView().animate({
                center: center,
                zoom: 17,
                duration: 800
            });
        }
    }

    if (mostrarPoligono && areaPolygonLayer) {
        areaPolygonLayer.setVisible(true);
    } else {
        if (areaPolygonLayer) {
            areaPolygonLayer.setVisible(false);
        }
    }
}

// ============================================
// RUTA AL ÁREA INFANTIL - CON OSRM
// ============================================
function trazarRutaArea(areaId) {
    const area = gestorAreasInfantiles.getArea(areaId);
    if (!area) {
        console.warn(`⚠️ Área ${areaId} no encontrada`);
        return;
    }
    
    if (!currentPosition) {
        alert('⚠️ Esperando ubicación actual...');
        return;
    }
    
    cerrarModalArea();
    
    console.log(`🧭 Trazando ruta a ${area.nombre}`);
    console.log(`📍 Ubicación actual: ${currentPosition.lat}, ${currentPosition.lon}`);
    
    activarArea(areaId, true);
    
    const origen = [currentPosition.lon, currentPosition.lat];
    const destino = area.coords || area.area[0];
    
    console.log(`📍 Origen: [${origen.join(', ')}]`);
    console.log(`📍 Destino: [${destino.join(', ')}]`);
    
    mostrarIndicadorCarga('Calculando ruta al área infantil...');
    
    gestorRutas.calcularRuta(origen, destino)
        .then(() => {
            console.log('✅ Ruta calculada exitosamente');
            ocultarIndicadorCarga();
            gestorRutas.iniciarSeguimiento(3000);
            mostrarPanelInstruccionesArea(areaId);
            reproducirSonidoRuta();
        })
        .catch((error) => {
            console.error('❌ Error al trazar ruta:', error);
            ocultarIndicadorCarga();
            alert('No se pudo calcular la ruta. Intenta de nuevo.\n\nError: ' + error.message);
        });
}

// ============================================
// MOSTRAR PANEL DE INSTRUCCIONES PARA ÁREA INFANTIL
// ============================================
function mostrarPanelInstruccionesArea(areaId) {
    const area = gestorAreasInfantiles.getArea(areaId);
    if (!area) return;
    
    const panelAnterior = document.getElementById('routePanel');
    if (panelAnterior) panelAnterior.remove();
    
    const panel = document.createElement('div');
    panel.id = 'routePanel';
    panel.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        padding: 16px 24px;
        z-index: 9999;
        max-width: 90%;
        min-width: 280px;
        font-family: Arial, sans-serif;
        animation: slideUp 0.3s ease;
        border: 2px solid #FFD700;
    `;
    
    const emoji = area.emoji || '🛝';
    const nombre = area.nombre || 'Área Infantil';
    
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:14px;color:#666;">${emoji} ${nombre}</span>
            <button id="cancelRouteBtn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">×</button>
        </div>
        <div id="routeInstructions" style="font-size:15px;color:#333;padding:4px 0;">
            <span style="color:#FFD700;">●</span> Cargando instrucciones...
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:#888;">
            <span id="routeDistance">Distancia: 0 m</span>
            <span id="routeTime">Tiempo: 0 min</span>
        </div>
        <div style="margin-top:8px;height:3px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
            <div id="routeProgress" style="height:100%;width:0%;background:linear-gradient(90deg,#FFD700,#fbbf24);transition:width 0.5s;"></div>
        </div>
        <div style="margin-top:6px;font-size:11px;color:#999;text-align:center;">
            🧒 Zona de juegos infantiles
        </div>
    `;
    
    document.body.appendChild(panel);
    
    document.getElementById('cancelRouteBtn').addEventListener('click', () => {
        gestorRutas.cancelarRuta();
        panel.remove();
        if (areaPolygonLayer) {
            areaPolygonLayer.setVisible(false);
        }
        if (activeAreaId !== null) {
            const prevMarker = areasMarkers[activeAreaId];
            if (prevMarker) {
                prevMarker.set('active', false);
                prevMarker.changed();
            }
            activeAreaId = null;
        }
    });
    
    gestorRutas.on('onRutaActualizada', (data) => {
        const inst = gestorRutas.getInstruccionActual();
        const instruccionText = inst ? inst.instruccion : 'Continuar...';
        
        const instrEl = document.getElementById('routeInstructions');
        if (instrEl) {
            instrEl.innerHTML = `<span style="color:#FFD700;">●</span> ${instruccionText}`;
        }
        
        const distEl = document.getElementById('routeDistance');
        if (distEl) {
            const distRestante = data.distanciaRestante || 0;
            distEl.textContent = `Distancia: ${Math.round(distRestante)} m`;
        }
        
        const timeEl = document.getElementById('routeTime');
        if (timeEl) {
            const timeRestante = data.tiempoRestante || 0;
            const minutos = Math.floor(timeRestante / 60);
            const segundos = Math.floor(timeRestante % 60);
            timeEl.textContent = `Tiempo: ${minutos}:${segundos.toString().padStart(2, '0')}`;
        }
        
        const progressEl = document.getElementById('routeProgress');
        if (progressEl && gestorRutas.distanciaTotal > 0) {
            const progress = ((gestorRutas.distanciaTotal - (data.distanciaRestante || 0)) / gestorRutas.distanciaTotal) * 100;
            progressEl.style.width = `${Math.min(100, progress)}%`;
        }
    });
    
    setTimeout(() => {
        const distEl = document.getElementById('routeDistance');
        if (distEl && gestorRutas.distanciaTotal) {
            distEl.textContent = `Distancia: ${Math.round(gestorRutas.distanciaTotal)} m`;
        }
        
        const timeEl = document.getElementById('routeTime');
        if (timeEl && gestorRutas.tiempoTotal) {
            const minutos = Math.floor(gestorRutas.tiempoTotal / 60);
            const segundos = Math.floor(gestorRutas.tiempoTotal % 60);
            timeEl.textContent = `Tiempo: ${minutos}:${segundos.toString().padStart(2, '0')}`;
        }
    }, 500);
}

// ============================================
// FUNCIONES AUXILIARES COMPARTIDAS
// ============================================
function mostrarIndicadorCarga(mensaje) {
    let loader = document.getElementById('routeLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'routeLoader';
        loader.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 30px 40px;
            border-radius: 16px;
            z-index: 10000;
            text-align: center;
            min-width: 200px;
            backdrop-filter: blur(10px);
        `;
        loader.innerHTML = `
            <div style="display:inline-block;width:40px;height:40px;border:4px solid rgba(255,255,255,0.1);border-radius:50%;border-top-color:#FFD700;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
            <p style="margin:0;font-size:16px;font-family:Arial,sans-serif;" id="loaderText">Calculando...</p>
        `;
        document.body.appendChild(loader);
        
        if (!document.getElementById('spinStyle')) {
            const style = document.createElement('style');
            style.id = 'spinStyle';
            style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
    }
    
    const textEl = loader.querySelector('#loaderText');
    if (textEl) textEl.textContent = mensaje || 'Calculando...';
    loader.style.display = 'block';
}

function ocultarIndicadorCarga() {
    const loader = document.getElementById('routeLoader');
    if (loader) loader.style.display = 'none';
}

function reproducirSonidoRuta() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gain.gain.value = 0.1;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.frequency.value = 1100;
        }, 100);
        setTimeout(() => {
            oscillator.stop();
        }, 300);
    } catch (e) {
        // Silenciar errores de audio
    }
}

// ============================================
// REFRESCAR ÁREAS INFANTILES
// ============================================
function refrescarAreas() {
    if (areaPolygonLayer) {
        areaPolygonLayer.getSource().clear();
    }
    if (areaMarkerLayer) {
        areaMarkerLayer.getSource().clear();
    }
    areasPolygons = {};
    areasMarkers = {};
    
    const areas = gestorAreasInfantiles.getTodasAreas();
    Object.keys(areas).forEach(areaId => {
        crearFeatureArea(areaId, areas[areaId]);
    });
}

// ============================================
// MOSTRAR/OCULTAR ÁREAS INFANTILES
// ============================================
function toggleAreas() {
    areasVisibles = !areasVisibles;
    
    if (areaPolygonLayer) {
        areaPolygonLayer.setVisible(areasVisibles);
    }
    if (areaMarkerLayer) {
        areaMarkerLayer.setVisible(areasVisibles);
    }
    
    const btn = document.getElementById('toggleAreasBtn');
    if (btn) {
        if (areasVisibles) {
            btn.classList.remove('oculto');
            btn.innerHTML = `
                <i class="fas fa-child"></i>
                Áreas Infantiles
            `;
            btn.title = 'Ocultar áreas infantiles';
        } else {
            btn.classList.add('oculto');
            btn.innerHTML = `
                <i class="fas fa-child"></i>
                Mostrar Áreas Infantiles
            `;
            btn.title = 'Mostrar áreas infantiles';
        }
    }
    
    console.log(`🛝 Áreas infantiles ${areasVisibles ? 'visible' : 'oculto'}`);
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventosAreas() {
    // Click en marcadores de áreas infantiles
    map.on('click', function(evt) {
        const features = map.getFeaturesAtPixel(evt.pixel, {
            hitTolerance: 15,
            layers: [areaMarkerLayer]
        });
        
        if (features && features.length > 0) {
            const feature = features[0];
            const areaId = feature.get('areaId');
            if (areaId) {
                console.log(`🛝 Click en área infantil: ${areaId}`);
                activarArea(areaId);
                abrirModalArea(areaId);
            }
        }
    });
    
    // Hover para cambiar cursor
    map.on('pointermove', function(evt) {
        const pixel = map.getEventPixel(evt.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel, {
            hitTolerance: 15,
            layers: [areaMarkerLayer]
        });
        
        const targetId = map.getTarget();
        const targetElement = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        if (targetElement) {
            targetElement.style.cursor = hit ? 'pointer' : 'default';
        }
    });
    
    // === EVENTOS DEL MODAL DE ÁREAS ===
    const closeBtn = document.getElementById('areaModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModalArea);
    }
    
    const modal = document.getElementById('areaModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalArea();
            }
        });
    }
    
    // Cerrar con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('areaModal');
            if (modal && modal.classList.contains('active')) {
                cerrarModalArea();
            }
        }
    });
    
    // Botón toggle áreas
    const toggleBtn = document.getElementById('toggleAreasBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleAreas);
    }
    
    // === Actualizar estilos al hacer zoom ===
    map.getView().on('change:resolution', function() {
        if (areaMarkerLayer) {
            areaMarkerLayer.changed();
        }
    });
    
    console.log('✅ Eventos de áreas infantiles configurados correctamente');
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        inicializarAreasInfantiles();
    }, 1000);
});