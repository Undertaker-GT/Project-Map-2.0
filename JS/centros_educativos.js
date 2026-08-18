// ============================================
// CENTROS EDUCATIVOS - VERSIÓN CON OSRM
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
    console.log('🏫 Inicializando sistema de centros educativos (modo optimizado)...');
    
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
    // Capa para polígonos - OCULTA POR DEFECTO
    centroEducativoPolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#3B5998';
            return crearEstiloPoligonoCentroEducativo(isActive, color);
        },
        visible: false
    });
    map.addLayer(centroEducativoPolygonLayer);
    
    // Capa para marcadores - SOLO EMOJI (sin círculo)
    centroEducativoMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const centroId = feature.get('centroId');
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#3B5998';
            const emoji = feature.get('emoji') || '🏫';
            const centroData = feature.get('centroData');
            return crearEstiloMarcadorCentroEducativo(centroId, isActive, color, emoji, centroData);
        },
        updateWhileAnimating: true,
        updateWhileInteracting: true
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
        
        // Crear marcador
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

function crearEstiloMarcadorCentroEducativo(centroId, active = false, color = '#3B5998', emoji = '🏫', centroData = null) {
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
    
    // Opción 1: Emoji + Nombre en 2 líneas
    let nombreMostrar = centroId;
    if (centroData && centroData.nombre) {
        nombreMostrar = centroData.nombre.length > 12 ? 
            centroData.nombre.substring(0, 10) + '…' : 
            centroData.nombre;
    }
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
// ABRIR MODAL DE CENTRO EDUCATIVO
// ============================================
function abrirModalCentroEducativo(centroId) {
    const centro = gestorCentrosEducativos.getCentro(centroId);
    if (!centro) {
        console.warn(`⚠️ Centro educativo ${centroId} no encontrado`);
        return;
    }
    
    activeCentroEducativoId = centroId;
    
    const titulo = document.getElementById('centroEducativoTitulo');
    if (titulo) {
        titulo.textContent = centro.emoji + ' ' + (centro.nombre || 'Centro Educativo');
    }
    
    const lista = document.getElementById('listaCentrosEducativos');
    if (!lista) return;
    
    lista.innerHTML = '';
    
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
                <span class="centro-educativo-tipo">${centro.tipo || 'Institución educativa'}</span>
                ${centro.direccion ? `<p class="centro-educativo-dir">📍 ${centro.direccion}</p>` : ''}
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
// ACTIVAR CENTRO EDUCATIVO
// ============================================
function activarCentroEducativo(centroId, mostrarPoligono = false) {
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
    
    // Centrar el mapa en el centro educativo (solo si se muestra el polígono)
    if (mostrarPoligono) {
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
    }

    if (mostrarPoligono && centroEducativoPolygonLayer) {
        centroEducativoPolygonLayer.setVisible(true);
    } else {
        if (centroEducativoPolygonLayer) {
            centroEducativoPolygonLayer.setVisible(false);
        }
    }
}

// ============================================
// RUTA AL CENTRO EDUCATIVO - CON OSRM
// ============================================
function trazarRutaCentroEducativo(centroId) {
    const centro = gestorCentrosEducativos.getCentro(centroId);
    if (!centro) {
        console.warn(`⚠️ Centro educativo ${centroId} no encontrado`);
        return;
    }
    
    if (!currentPosition) {
        alert('⚠️ Esperando ubicación actual...');
        return;
    }
    
    cerrarModalCentroEducativo();
    
    console.log(`🧭 Trazando ruta a ${centro.nombre}`);
    console.log(`📍 Ubicación actual: ${currentPosition.lat}, ${currentPosition.lon}`);
    
    activarCentroEducativo(centroId, true);
    
    const origen = [currentPosition.lon, currentPosition.lat];
    const destino = centro.coords || centro.area[0];
    
    console.log(`📍 Origen: [${origen.join(', ')}]`);
    console.log(`📍 Destino: [${destino.join(', ')}]`);
    
    mostrarIndicadorCarga('Calculando ruta al centro educativo...');
    
    gestorRutas.calcularRuta(origen, destino)
        .then(() => {
            console.log('✅ Ruta calculada exitosamente');
            ocultarIndicadorCarga();
            gestorRutas.iniciarSeguimiento(3000);
            mostrarPanelInstruccionesCentroEducativo(centroId);
            reproducirSonidoRuta();
        })
        .catch((error) => {
            console.error('❌ Error al trazar ruta:', error);
            ocultarIndicadorCarga();
            alert('No se pudo calcular la ruta. Intenta de nuevo.\n\nError: ' + error.message);
        });
}

// ============================================
// MOSTRAR PANEL DE INSTRUCCIONES PARA CENTRO EDUCATIVO
// ============================================
function mostrarPanelInstruccionesCentroEducativo(centroId) {
    const centro = gestorCentrosEducativos.getCentro(centroId);
    if (!centro) return;
    
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
        border: 2px solid #3B5998;
    `;
    
    const emoji = centro.emoji || '🏫';
    const nombre = centro.nombre || 'Centro Educativo';
    const tipo = centro.tipo || 'Institución educativa';
    
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:14px;color:#666;">${emoji} ${nombre}</span>
            <button id="cancelRouteBtn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">×</button>
        </div>
        <div id="routeInstructions" style="font-size:15px;color:#333;padding:4px 0;">
            <span style="color:#3B5998;">●</span> Cargando instrucciones...
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:#888;">
            <span id="routeDistance">Distancia: 0 m</span>
            <span id="routeTime">Tiempo: 0 min</span>
        </div>
        <div style="margin-top:8px;height:3px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
            <div id="routeProgress" style="height:100%;width:0%;background:linear-gradient(90deg,#3B5998,#5B7BB5);transition:width 0.5s;"></div>
        </div>
        <div style="margin-top:6px;font-size:11px;color:#999;text-align:center;">
            📚 ${tipo}
        </div>
    `;
    
    document.body.appendChild(panel);
    
    document.getElementById('cancelRouteBtn').addEventListener('click', () => {
        gestorRutas.cancelarRuta();
        panel.remove();
        if (centroEducativoPolygonLayer) {
            centroEducativoPolygonLayer.setVisible(false);
        }
        if (activeCentroEducativoId !== null) {
            const prevMarker = centrosEducativosMarkers[activeCentroEducativoId];
            if (prevMarker) {
                prevMarker.set('active', false);
                prevMarker.changed();
            }
            activeCentroEducativoId = null;
        }
    });
    
    gestorRutas.on('onRutaActualizada', (data) => {
        const inst = gestorRutas.getInstruccionActual();
        const instruccionText = inst ? inst.instruccion : 'Continuar...';
        
        const instrEl = document.getElementById('routeInstructions');
        if (instrEl) {
            instrEl.innerHTML = `<span style="color:#3B5998;">●</span> ${instruccionText}`;
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
            <div style="display:inline-block;width:40px;height:40px;border:4px solid rgba(255,255,255,0.1);border-radius:50%;border-top-color:#3B5998;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
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
                <i class="fas fa-school"></i>
                Colegio
            `;
            btn.title = 'Ocultar centros educativos';
        } else {
            btn.classList.add('oculto');
            btn.innerHTML = `
                <i class="fas fa-school"></i>
                Mostrar Colegio
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
    const closeBtn = document.getElementById('centroEducativoModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModalCentroEducativo);
    }
    
    const modal = document.getElementById('centroEducativoModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalCentroEducativo();
            }
        });
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
    }
    
    // === Actualizar estilos al hacer zoom ===
    map.getView().on('change:resolution', function() {
        if (centroEducativoMarkerLayer) {
            centroEducativoMarkerLayer.changed();
        }
    });
    
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