// ============================================
// GIMNASIOS - VERSIÓN CON OSRM
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
    console.log('💪 Inicializando sistema de gimnasios (modo optimizado)...');
    
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
    // Capa para polígonos - OCULTA POR DEFECTO
    gimnasioPolygonLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FF4500';
            return crearEstiloPoligonoGimnasio(isActive, color);
        },
        visible: false
    });
    map.addLayer(gimnasioPolygonLayer);
    
    // Capa para marcadores - SOLO EMOJI (sin círculo)
    gimnasioMarkerLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            const gimnasioId = feature.get('gimnasioId');
            const isActive = feature.get('active') || false;
            const color = feature.get('color') || '#FF4500';
            const emoji = feature.get('emoji') || '💪';
            const gimnasioData = feature.get('gimnasioData');
            return crearEstiloMarcadorGimnasio(gimnasioId, isActive, color, emoji, gimnasioData);
        },
        updateWhileAnimating: true,
        updateWhileInteracting: true
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
        
        // Crear marcador
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

function crearEstiloMarcadorGimnasio(gimnasioId, active = false, color = '#FF4500', emoji = '💪', gimnasioData = null) {
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
    
    let nombreMostrar = gimnasioId;
    if (gimnasioData && gimnasioData.nombre) {
        nombreMostrar = gimnasioData.nombre.length > 12 ? 
            gimnasioData.nombre.substring(0, 10) + '…' : 
            gimnasioData.nombre;
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
// ABRIR MODAL DE GIMNASIO
// ============================================
function abrirModalGimnasio(gimnasioId) {
    const gimnasio = gestorGimnasios.getGimnasio(gimnasioId);
    if (!gimnasio) {
        console.warn(`⚠️ Gimnasio ${gimnasioId} no encontrado`);
        return;
    }
    
    activeGimnasioId = gimnasioId;
    
    const titulo = document.getElementById('gimnasioTitulo');
    if (titulo) {
        titulo.textContent = gimnasio.emoji + ' ' + (gimnasio.nombre || 'Gimnasio');
    }
    
    const lista = document.getElementById('listaGimnasios');
    if (!lista) return;
    
    lista.innerHTML = '';
    
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
                ${gimnasio.direccion ? `<p class="gimnasio-dir">📍 ${gimnasio.direccion}</p>` : ''}
                ${gimnasio.horario ? `<p class="gimnasio-horario">🕐 ${gimnasio.horario}</p>` : ''}
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
// ACTIVAR GIMNASIO
// ============================================
function activarGimnasio(gimnasioId, mostrarPoligono = false) {
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
    
    // Centrar el mapa en el gimnasio (solo si se muestra el polígono)
    if (mostrarPoligono) {
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
    }

    if (mostrarPoligono && gimnasioPolygonLayer) {
        gimnasioPolygonLayer.setVisible(true);
    } else {
        if (gimnasioPolygonLayer) {
            gimnasioPolygonLayer.setVisible(false);
        }
    }
}

// ============================================
// RUTA AL GIMNASIO - CON OSRM
// ============================================
function trazarRutaGimnasio(gimnasioId) {
    const gimnasio = gestorGimnasios.getGimnasio(gimnasioId);
    if (!gimnasio) {
        console.warn(`⚠️ Gimnasio ${gimnasioId} no encontrado`);
        return;
    }
    
    if (!currentPosition) {
        alert('⚠️ Esperando ubicación actual...');
        return;
    }
    
    cerrarModalGimnasio();
    
    console.log(`🧭 Trazando ruta a ${gimnasio.nombre}`);
    console.log(`📍 Ubicación actual: ${currentPosition.lat}, ${currentPosition.lon}`);
    
    activarGimnasio(gimnasioId, true);
    
    const origen = [currentPosition.lon, currentPosition.lat];
    const destino = gimnasio.coords || gimnasio.area[0];
    
    console.log(`📍 Origen: [${origen.join(', ')}]`);
    console.log(`📍 Destino: [${destino.join(', ')}]`);
    
    mostrarIndicadorCarga('Calculando ruta al gimnasio...');
    
    gestorRutas.calcularRuta(origen, destino)
        .then(() => {
            console.log('✅ Ruta calculada exitosamente');
            ocultarIndicadorCarga();
            gestorRutas.iniciarSeguimiento(3000);
            mostrarPanelInstruccionesGimnasio(gimnasioId);
            reproducirSonidoRuta();
        })
        .catch((error) => {
            console.error('❌ Error al trazar ruta:', error);
            ocultarIndicadorCarga();
            alert('No se pudo calcular la ruta. Intenta de nuevo.\n\nError: ' + error.message);
        });
}

// ============================================
// MOSTRAR PANEL DE INSTRUCCIONES PARA GIMNASIO
// ============================================
function mostrarPanelInstruccionesGimnasio(gimnasioId) {
    const gimnasio = gestorGimnasios.getGimnasio(gimnasioId);
    if (!gimnasio) return;
    
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
        border: 2px solid #FF4500;
    `;
    
    const emoji = gimnasio.emoji || '💪';
    const nombre = gimnasio.nombre || 'Gimnasio';
    const tipo = gimnasio.tipo || 'Zona de Ejercicio';
    
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:14px;color:#666;">${emoji} ${nombre}</span>
            <button id="cancelRouteBtn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">×</button>
        </div>
        <div id="routeInstructions" style="font-size:15px;color:#333;padding:4px 0;">
            <span style="color:#FF4500;">●</span> Cargando instrucciones...
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:#888;">
            <span id="routeDistance">Distancia: 0 m</span>
            <span id="routeTime">Tiempo: 0 min</span>
        </div>
        <div style="margin-top:8px;height:3px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
            <div id="routeProgress" style="height:100%;width:0%;background:linear-gradient(90deg,#FF4500,#FF6A33);transition:width 0.5s;"></div>
        </div>
        <div style="margin-top:6px;font-size:11px;color:#999;text-align:center;">
            💪 ${tipo} ${gimnasio.horario ? `| 🕐 ${gimnasio.horario}` : ''}
        </div>
    `;
    
    document.body.appendChild(panel);
    
    document.getElementById('cancelRouteBtn').addEventListener('click', () => {
        gestorRutas.cancelarRuta();
        panel.remove();
        if (gimnasioPolygonLayer) {
            gimnasioPolygonLayer.setVisible(false);
        }
        if (activeGimnasioId !== null) {
            const prevMarker = gimnasiosMarkers[activeGimnasioId];
            if (prevMarker) {
                prevMarker.set('active', false);
                prevMarker.changed();
            }
            activeGimnasioId = null;
        }
    });
    
    gestorRutas.on('onRutaActualizada', (data) => {
        const inst = gestorRutas.getInstruccionActual();
        const instruccionText = inst ? inst.instruccion : 'Continuar...';
        
        const instrEl = document.getElementById('routeInstructions');
        if (instrEl) {
            instrEl.innerHTML = `<span style="color:#FF4500;">●</span> ${instruccionText}`;
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
            <div style="display:inline-block;width:40px;height:40px;border:4px solid rgba(255,255,255,0.1);border-radius:50%;border-top-color:#FF4500;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div>
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
                <i class="fas fa-dumbbell"></i>
                Gimnasio
            `;
            btn.title = 'Ocultar gimnasio';
        } else {
            btn.classList.add('oculto');
            btn.innerHTML = `
                <i class="fas fa-dumbbell"></i>
                Mostrar Gimnasio
            `;
            btn.title = 'Mostrar Gimnasio';
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
    const closeBtn = document.getElementById('gimnasioModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModalGimnasio);
    }
    
    const modal = document.getElementById('gimnasioModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalGimnasio();
            }
        });
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
    }
    
    // === Actualizar estilos al hacer zoom ===
    map.getView().on('change:resolution', function() {
        if (gimnasioMarkerLayer) {
            gimnasioMarkerLayer.changed();
        }
    });
    
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