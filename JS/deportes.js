// ============================================
// DEPORTES - VERSIÓN OPTIMIZADA PARA MÓVILES
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
    console.log('🏟️ Inicializando sistema de centros deportivos (modo optimizado)...');
    
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
    // Capa para polígonos - OCULTA POR DEFECTO
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
    
    // Capa para marcadores - SOLO EMOJI (sin círculo)
    deporteMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const deporteId = feature.get('deporteId');
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#088729';
            const emoji = feature.get('emoji') || '🏟️';
            const deporteData = feature.get('deporteData');
            return crearEstiloMarcadorDeporte(deporteId, isActive, color, emoji, deporteData);
        },
        updateWhileAnimating: true,
        updateWhileInteracting: true
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
        
        // Crear marcador
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

function crearEstiloMarcadorDeporte(deporteId, active = false, color = '#088729', emoji = '🏟️', deporteData = null) {
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
// CERRAR MODAL DE DEPORTE - ¡ESTA ES LA QUE FALTABA!
// ============================================
function cerrarModalDeporte() {
    const modal = document.getElementById('deporteModal');
    if (modal) {
        modal.classList.remove('active');
    }
    activeDeporteId = null;
}

// ============================================
// ABRIR MODAL DE DEPORTE - VERSIÓN ÚNICA
// ============================================
function abrirModalDeporte(deporteId) {
    const deporte = gestorDeportes.getDeporte(deporteId);
    if (!deporte) {
        console.warn(`⚠️ Deporte ${deporteId} no encontrado`);
        return;
    }
    
    activeDeporteId = deporteId;
    
    const titulo = document.getElementById('deporteTitulo');
    if (titulo) {
        titulo.textContent = deporte.emoji + ' ' + (deporte.nombre || 'Centro Deportivo');
    }
    
    const lista = document.getElementById('listaDeportes');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    const fotosHTML = deporte.fotos && deporte.fotos.length > 0 ?
        deporte.fotos.map(f => `<img src="${f}" alt="${deporte.nombre}" onerror="this.style.display='none'">`).join('') :
        '<p style="color:#94a3b8;font-size:13px;padding:8px;">Sin imágenes disponibles</p>';
    
    const tipoInfo = deporte.tipo || 'Zona Deportiva';
    const descripcion = deporte.descripcion || '';
    
    const item = document.createElement('div');
    item.className = 'deporte-card';
    item.innerHTML = `
        <div class="deporte-carousel">
            ${fotosHTML}
        </div>
        <div class="deporte-info">
            <div class="deporte-tipo">${deporte.emoji} ${tipoInfo}</div>
            ${descripcion ? `<p class="deporte-descripcion">${descripcion}</p>` : ''}
            <button onclick="trazarRutaADeporte('${deporteId}')">
                <i class="fas fa-route"></i> Trazar ruta
            </button>
        </div>
    `;
    lista.appendChild(item);
    
    document.getElementById('deporteModal').classList.add('active');
}

// ============================================
// ACTIVAR DEPORTE - VERSIÓN ÚNICA
// ============================================
function activarDeporte(deporteId, mostrarPoligono = false) {
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
    
    // Centrar el mapa en el deporte (solo si se muestra el polígono)
    if (mostrarPoligono) {
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
    }
    
    if (mostrarPoligono && deportePolygonLayer) {
        deportePolygonLayer.setVisible(true);
    } else {
        if (deportePolygonLayer) {
            deportePolygonLayer.setVisible(false);
        }
    }
}

// ============================================
// RUTA AL DEPORTE - CON OSRM
// ============================================
function trazarRutaADeporte(deporteId) {
    const deporte = gestorDeportes.getDeporte(deporteId);
    if (!deporte) {
        console.warn(`⚠️ Deporte ${deporteId} no encontrado`);
        return;
    }
    
    if (!currentPosition) {
        alert('⚠️ Esperando ubicación actual...');
        return;
    }
    
    cerrarModalDeporte();
    
    console.log(`🧭 Trazando ruta a ${deporte.nombre}`);
    console.log(`📍 Ubicación actual: ${currentPosition.lat}, ${currentPosition.lon}`);
    
    activarDeporte(deporteId, true);
    
    const origen = [currentPosition.lon, currentPosition.lat];
    const destino = deporte.coords || deporte.area[0];
    
    console.log(`📍 Origen: [${origen.join(', ')}]`);
    console.log(`📍 Destino: [${destino.join(', ')}]`);
    
    mostrarIndicadorCarga('Calculando ruta al centro deportivo...');
    
    gestorRutas.calcularRuta(origen, destino)
        .then(() => {
            console.log('✅ Ruta calculada exitosamente');
            ocultarIndicadorCarga();
            gestorRutas.iniciarSeguimiento(3000);
            mostrarPanelInstruccionesDeporte(deporteId);
            reproducirSonidoRuta();
        })
        .catch((error) => {
            console.error('❌ Error al trazar ruta:', error);
            ocultarIndicadorCarga();
            alert('No se pudo calcular la ruta. Intenta de nuevo.\n\nError: ' + error.message);
        });
}

// ============================================
// MOSTRAR PANEL DE INSTRUCCIONES PARA DEPORTE
// ============================================
function mostrarPanelInstruccionesDeporte(deporteId) {
    const deporte = gestorDeportes.getDeporte(deporteId);
    if (!deporte) return;
    
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
        border: 2px solid #088729;
    `;
    
    const emoji = deporte.emoji || '🏟️';
    const nombre = deporte.nombre || 'Centro Deportivo';
    
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:14px;color:#666;">${emoji} ${nombre}</span>
            <button id="cancelRouteBtn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">×</button>
        </div>
        <div id="routeInstructions" style="font-size:15px;color:#333;padding:4px 0;">
            <span style="color:#088729;">●</span> Cargando instrucciones...
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:#888;">
            <span id="routeDistance">Distancia: 0 m</span>
            <span id="routeTime">Tiempo: 0 min</span>
        </div>
        <div style="margin-top:8px;height:3px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
            <div id="routeProgress" style="height:100%;width:0%;background:linear-gradient(90deg,#088729,#22c55e);transition:width 0.5s;"></div>
        </div>
        <div style="margin-top:6px;font-size:11px;color:#999;text-align:center;">
            ${deporte.tipo || 'Centro Deportivo'}
        </div>
    `;
    
    document.body.appendChild(panel);
    
    document.getElementById('cancelRouteBtn').addEventListener('click', () => {
        gestorRutas.cancelarRuta();
        panel.remove();
        if (deportePolygonLayer) {
            deportePolygonLayer.setVisible(false);
        }
        if (activeDeporteId !== null) {
            const prevMarker = deportesMarkers[activeDeporteId];
            if (prevMarker) {
                prevMarker.set('active', false);
                prevMarker.changed();
            }
            activeDeporteId = null;
        }
    });
    
    gestorRutas.on('onRutaActualizada', (data) => {
        const inst = gestorRutas.getInstruccionActual();
        const instruccionText = inst ? inst.instruccion : 'Continuar...';
        
        const instrEl = document.getElementById('routeInstructions');
        if (instrEl) {
            instrEl.innerHTML = `<span style="color:#088729;">●</span> ${instruccionText}`;
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
            <div style="display:inline-block;width:40px;height:40px;border:4px solid rgba(255,255,255,0.1);border-radius:50%;border-top-color:#088729;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
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
    const closeBtn = document.getElementById('deporteModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModalDeporte);
    }
    
    const modal = document.getElementById('deporteModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalDeporte();
            }
        });
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
    }
    
    // === Actualizar estilos al hacer zoom ===
    map.getView().on('change:resolution', function() {
        if (deporteMarkerLayer) {
            deporteMarkerLayer.changed();
        }
    });
    
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