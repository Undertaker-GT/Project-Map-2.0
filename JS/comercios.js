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
    if (!centro) {
        console.warn(`⚠️ Centro ${centroId} no encontrado`);
        return;
    }
    
    const comercio = centro.comercios[comercioIndex];
    if (!comercio) {
        console.warn(`⚠️ Comercio ${comercioIndex} no encontrado`);
        return;
    }
    
    // Verificar que hay posición del usuario
    if (!currentPosition) {
        alert('⚠️ Esperando ubicación actual...');
        return;
    }
    
    cerrarModalCentro();
    
    console.log(`🧭 Trazando ruta a ${comercio.nombre} en ${centro.nombre}`);
    console.log(`📍 Ubicación actual: ${currentPosition.lat}, ${currentPosition.lon}`);
    
    // Activar centro Y mostrar polígono
    activarCentro(centroId, true);
    
    // Coordenadas de origen y destino
    const origen = [currentPosition.lon, currentPosition.lat];
    const destino = comercio.coords;
    
    console.log(`📍 Origen: [${origen.join(', ')}]`);
    console.log(`📍 Destino: [${destino.join(', ')}]`);
    
    // Mostrar indicador de carga
    mostrarIndicadorCarga('Calculando ruta al comercio...');
    
    // Calcular la ruta usando el gestor de rutas (OSRM)
    gestorRutas.calcularRuta(origen, destino)
        .then(() => {
            console.log('✅ Ruta calculada exitosamente');
            ocultarIndicadorCarga();
            
            // Iniciar seguimiento en tiempo real
            gestorRutas.iniciarSeguimiento(3000);
            
            // Mostrar panel de instrucciones para comercio
            mostrarPanelInstruccionesComercio(centroId, comercio);
            
            // Reproducir sonido de inicio de ruta (opcional)
            reproducirSonidoRuta();
        })
        .catch((error) => {
            console.error('❌ Error al trazar ruta:', error);
            ocultarIndicadorCarga();
            alert('No se pudo calcular la ruta. Intenta de nuevo.\n\nError: ' + error.message);
        });
}

// ============================================
// MOSTRAR PANEL DE INSTRUCCIONES PARA COMERCIO
// ============================================
function mostrarPanelInstruccionesComercio(centroId, comercio) {
    // Eliminar panel anterior si existe
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
        border: 2px solid #f59e0b;
    `;
    
    const nombreComercio = comercio.nombre || 'Comercio';
    const nombreCentro = centroId || 'Centro';
    
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:14px;color:#666;">🛍️ ${nombreComercio}</span>
            <button id="cancelRouteBtn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">×</button>
        </div>
        <div id="routeInstructions" style="font-size:15px;color:#333;padding:4px 0;">
            <span style="color:#f59e0b;">●</span> Cargando instrucciones...
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:#888;">
            <span id="routeDistance">Distancia: 0 m</span>
            <span id="routeTime">Tiempo: 0 min</span>
        </div>
        <div style="margin-top:8px;height:3px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
            <div id="routeProgress" style="height:100%;width:0%;background:linear-gradient(90deg,#f59e0b,#fbbf24);transition:width 0.5s;"></div>
        </div>
        <div style="margin-top:6px;font-size:11px;color:#999;text-align:center;">
            Destino: ${nombreCentro}
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Evento para cancelar ruta
    document.getElementById('cancelRouteBtn').addEventListener('click', () => {
        gestorRutas.cancelarRuta();
        panel.remove();
        // Ocultar polígono del centro
        if (centroPolygonLayer) {
            centroPolygonLayer.setVisible(false);
        }
        // Desactivar centro
        if (activeCentroId !== null) {
            const prevMarker = centrosMarkers[activeCentroId];
            if (prevMarker) {
                prevMarker.set('active', false);
                prevMarker.changed();
            }
            activeCentroId = null;
        }
    });
    
    // Configurar listener para actualizaciones de ruta
    gestorRutas.on('onRutaActualizada', (data) => {
        const inst = gestorRutas.getInstruccionActual();
        const instruccionText = inst ? inst.instruccion : 'Continuar...';
        
        const instrEl = document.getElementById('routeInstructions');
        if (instrEl) {
            instrEl.innerHTML = `<span style="color:#f59e0b;">●</span> ${instruccionText}`;
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
        
        // Actualizar progreso
        const progressEl = document.getElementById('routeProgress');
        if (progressEl && gestorRutas.distanciaTotal > 0) {
            const progress = ((gestorRutas.distanciaTotal - (data.distanciaRestante || 0)) / gestorRutas.distanciaTotal) * 100;
            progressEl.style.width = `${Math.min(100, progress)}%`;
        }
    });
    
    // Actualizar información inicial
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
// MOSTRAR INDICADOR DE CARGA (compartido con sectores)
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
            <div style="display:inline-block;width:40px;height:40px;border:4px solid rgba(255,255,255,0.1);border-radius:50%;border-top-color:#f59e0b;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
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

// ============================================
// REPRODUCIR SONIDO DE RUTA (compartido)
// ============================================
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