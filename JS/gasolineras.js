// ============================================
// GASOLINERAS - VERSIÓN CON OSRM
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
    console.log('⛽ Inicializando sistema de gasolineras (modo optimizado)...');
    
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
    // Capa para marcadores - SOLO EMOJI (sin círculo)
    gasolineraMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const gasolineraId = feature.get('gasolineraId');
            const gasolineraData = feature.get('gasolineraData');
            const emoji = feature.get('emoji') || '⛽';
            return crearEstiloMarcadorGasolinera(gasolineraId, emoji, gasolineraData);
        },
        updateWhileAnimating: true,
        updateWhileInteracting: true
    });
    map.addLayer(gasolineraMarkerLayer);
}

// ============================================
// CREAR FEATURE DE GASOLINERA
// ============================================
function crearFeatureGasolinera(gasolineraId, gasolinera) {
    try {
        // Crear marcador - SIN CÍRCULO, SOLO EMOJI + NOMBRE
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
// NUEVO ESTILO: EMOJI + NOMBRE SIN CÍRCULO
// ============================================
function crearEstiloMarcadorGasolinera(gasolineraId, emoji = '⛽', gasolineraData = null) {
    // Colores según estado
    const textColor = '#333333';
    const bgColor = 'transparent';
    
    // Tamaño de fuente adaptativo según zoom
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
    
    // Obtener nombre corto para mostrar (máximo 12 caracteres)
    let nombreMostrar = gasolineraId;
    if (gasolineraData && gasolineraData.nombre) {
        nombreMostrar = gasolineraData.nombre.length > 12 ? 
            gasolineraData.nombre.substring(0, 10) + '…' : 
            gasolineraData.nombre;
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
                color: 'rgba(255,255,255,0.9)',
                width: 2
            }),
            textAlign: 'center',
            textBaseline: 'middle',
            offsetY: 0,
            backgroundFill: new ol.style.Fill({
                color: bgColor
            }),
            backgroundStroke: new ol.style.Stroke({
                color: 'rgba(255,255,255,0.2)',
                width: 2
            }),
            padding: [padding, padding + 4, padding, padding + 4]
        })
    });
}

// ============================================
// VERIFICAR SI LA GASOLINERA ESTÁ ABIERTA
// ============================================
function estaAbierto(horario) {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutosActual = ahora.getMinutes();
    const horaCompleta = horaActual + (minutosActual / 60);
    
    if (horario.apertura < horario.cierre) {
        return horaCompleta >= horario.apertura && horaCompleta < horario.cierre;
    } else {
        return horaCompleta >= horario.apertura || horaCompleta < horario.cierre;
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
    overlayElement.style.left = (pixel[0] - 180) + 'px';
    overlayElement.style.top = (pixel[1] - 200) + 'px';
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
// RUTA A LA GASOLINERA - CON OSRM
// ============================================
function trazarRutaGasolinera(gasolineraId) {
    const gasolinera = gestorGasolineras.getGasolinera(gasolineraId);
    if (!gasolinera) {
        console.warn(`⚠️ Gasolinera ${gasolineraId} no encontrada`);
        return;
    }
    
    if (!currentPosition) {
        alert('⚠️ Esperando ubicación actual...');
        return;
    }
    
    cerrarPopupGasolinera();
    
    console.log(`🧭 Trazando ruta a ${gasolinera.nombre}`);
    console.log(`📍 Ubicación actual: ${currentPosition.lat}, ${currentPosition.lon}`);
    
    const origen = [currentPosition.lon, currentPosition.lat];
    const destino = gasolinera.coords;
    
    console.log(`📍 Origen: [${origen.join(', ')}]`);
    console.log(`📍 Destino: [${destino.join(', ')}]`);
    
    mostrarIndicadorCarga('Calculando ruta a la gasolinera...');
    
    gestorRutas.calcularRuta(origen, destino)
        .then(() => {
            console.log('✅ Ruta calculada exitosamente');
            ocultarIndicadorCarga();
            gestorRutas.iniciarSeguimiento(3000);
            mostrarPanelInstruccionesGasolinera(gasolineraId);
            reproducirSonidoRuta();
        })
        .catch((error) => {
            console.error('❌ Error al trazar ruta:', error);
            ocultarIndicadorCarga();
            alert('No se pudo calcular la ruta. Intenta de nuevo.\n\nError: ' + error.message);
        });
}

// ============================================
// MOSTRAR PANEL DE INSTRUCCIONES PARA GASOLINERA
// ============================================
function mostrarPanelInstruccionesGasolinera(gasolineraId) {
    const gasolinera = gestorGasolineras.getGasolinera(gasolineraId);
    if (!gasolinera) return;
    
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
        border: 2px solid #2563eb;
    `;
    
    const emoji = gasolinera.emoji || '⛽';
    const nombre = gasolinera.nombre || 'Gasolinera';
    const tipo = gasolinera.tipo || 'Estación de servicio';
    const abierta = estaAbierto(gasolinera.horario);
    const estadoTexto = abierta ? '🟢 Abierto' : '🔴 Cerrado';
    
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:14px;color:#666;">${emoji} ${nombre}</span>
            <button id="cancelRouteBtn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">×</button>
        </div>
        <div id="routeInstructions" style="font-size:15px;color:#333;padding:4px 0;">
            <span style="color:#2563eb;">●</span> Cargando instrucciones...
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:#888;">
            <span id="routeDistance">Distancia: 0 m</span>
            <span id="routeTime">Tiempo: 0 min</span>
        </div>
        <div style="margin-top:8px;height:3px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
            <div id="routeProgress" style="height:100%;width:0%;background:linear-gradient(90deg,#2563eb,#60a5fa);transition:width 0.5s;"></div>
        </div>
        <div style="margin-top:6px;font-size:11px;color:#999;text-align:center;">
            ⛽ ${tipo} | ${estadoTexto} | ${gasolinera.horarioTexto || '5:00 AM - 11:00 PM'}
        </div>
    `;
    
    document.body.appendChild(panel);
    
    document.getElementById('cancelRouteBtn').addEventListener('click', () => {
        gestorRutas.cancelarRuta();
        panel.remove();
    });
    
    gestorRutas.on('onRutaActualizada', (data) => {
        const inst = gestorRutas.getInstruccionActual();
        const instruccionText = inst ? inst.instruccion : 'Continuar...';
        
        const instrEl = document.getElementById('routeInstructions');
        if (instrEl) {
            instrEl.innerHTML = `<span style="color:#2563eb;">●</span> ${instruccionText}`;
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
            <div style="display:inline-block;width:40px;height:40px;border:4px solid rgba(255,255,255,0.1);border-radius:50%;border-top-color:#2563eb;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
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
                <i class="fas fa-gas-pump"></i>
                Gasolinera
            `;
            btn.title = 'Ocultar gasolineras';
        } else {
            btn.classList.add('oculto');
            btn.innerHTML = `
                <i class="fas fa-gas-pump"></i>
                Mostrar Gasolinera
            `;
            btn.title = 'Mostrar Gasolinera';
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
    }
    
    // Actualizar estilos al hacer zoom
    map.getView().on('change:resolution', function() {
        if (gasolineraMarkerLayer) {
            gasolineraMarkerLayer.changed();
        }
    });
    
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