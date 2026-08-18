// ============================================
// GESTOR DE RUTAS - CON OSRM (IGUAL QUE TU SISTEMA ANTIGUO)
// ============================================
class GestorRutas {
    constructor() {
        // Configuración de OSRM (mismo que tu sistema antiguo)
        this.BASE_URL = 'https://router.project-osrm.org/route/v1';
        this.PROFILE = 'foot';  // 'foot', 'driving', 'cycling'
        
        // Estado de la ruta
        this.rutaActiva = false;
        this.rutaData = null;
        this.rutaCoords = [];
        this.distanciaTotal = 0;
        this.tiempoTotal = 0;
        this.instrucciones = [];
        this.currentStep = 0;
        
        // Capa de la ruta (OpenLayers)
        this.routeLayer = null;
        this.routeSource = null;
        this.markerInicio = null;
        this.markerDestino = null;
        
        // Callbacks
        this.callbacks = {
            onRutaIniciada: null,
            onRutaActualizada: null,
            onRutaFinalizada: null,
            onError: null
        };
        
        this.updateInterval = null;
        this.ultimaPosicion = null;
    }

    // ============================================
    // CALCULAR RUTA CON OSRM
    // ============================================
    async calcularRuta(origen, destino) {
        try {
            console.log('🧭 Calculando ruta con OSRM...');
            console.log(`📍 Origen: ${origen.join(', ')}`);
            console.log(`📍 Destino: ${destino.join(', ')}`);

            // OSRM usa formato: longitud,latitud (lon,lat)
            const url = `${this.BASE_URL}/${this.PROFILE}/${origen[0]},${origen[1]};${destino[0]},${destino[1]}?overview=full&geometries=geojson&steps=true`;
            
            console.log('🌐 URL:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.code !== 'Ok') {
                throw new Error(`OSRM error: ${data.code}`);
            }
            
            // Procesar la ruta
            const route = data.routes[0];
            const geometry = route.geometry;
            
            // Extraer coordenadas (GeoJSON)
            const coords = geometry.coordinates.map(c => [c[0], c[1]]);
            
            this.rutaCoords = coords;
            this.distanciaTotal = route.distance;
            this.tiempoTotal = route.duration;
            this.instrucciones = [];
            
            // Extraer instrucciones paso a paso
            if (route.legs && route.legs[0] && route.legs[0].steps) {
                this.instrucciones = route.legs[0].steps.map((step, index) => ({
                    index: index,
                    instruccion: step.maneuver.instruction || step.name || 'Continúa',
                    distancia: step.distance || 0,
                    duracion: step.duration || 0,
                    coords: step.geometry ? step.geometry.coordinates.map(c => [c[0], c[1]]) : []
                }));
            }
            
            this.rutaData = data;
            this.rutaActiva = true;
            this.currentStep = 0;
            
            console.log(`✅ Ruta calculada: ${this.distanciaTotal}m, ${this.tiempoTotal}s`);
            console.log(`📝 ${this.instrucciones.length} instrucciones`);
            
            // Crear visualización de la ruta
            this.crearRutaVisual(coords);
            
            if (this.callbacks.onRutaIniciada) {
                this.callbacks.onRutaIniciada(this);
            }
            
            return this;
            
        } catch (error) {
            console.error('❌ Error al calcular ruta con OSRM:', error);
            
            // Usar fallback (línea recta)
            console.log('🔄 Usando ruta de fallback...');
            return this.calcularRutaFallback(origen, destino);
        }
    }

    // ============================================
    // RUTA DE FALLBACK (LÍNEA RECTA)
    // ============================================
    calcularRutaFallback(origen, destino) {
        console.log('📍 Usando ruta de fallback (línea recta)');
        
        const coords = this.generarPuntosIntermedios(origen, destino, 20);
        
        this.rutaCoords = coords;
        this.distanciaTotal = this.calcularDistancia(origen, destino);
        this.tiempoTotal = this.distanciaTotal / 1.4;
        this.instrucciones = [
            { index: 0, instruccion: 'Dirígete hacia el destino', distancia: this.distanciaTotal, duracion: this.tiempoTotal }
        ];
        this.rutaActiva = true;
        this.currentStep = 0;
        
        this.crearRutaVisual(coords);
        
        if (this.callbacks.onRutaIniciada) {
            this.callbacks.onRutaIniciada(this);
        }
        
        return this;
    }

    // ============================================
    // GENERAR PUNTOS INTERMEDIOS
    // ============================================
    generarPuntosIntermedios(origen, destino, numPuntos = 10) {
        const puntos = [];
        const [x1, y1] = origen;
        const [x2, y2] = destino;
        
        for (let i = 0; i <= numPuntos; i++) {
            const t = i / numPuntos;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * 0.0001;
            puntos.push([x, y]);
        }
        
        return puntos;
    }

    // ============================================
    // CALCULAR DISTANCIA (HAVERSINE)
    // ============================================
    calcularDistancia(punto1, punto2) {
        const [lon1, lat1] = punto1;
        const [lon2, lat2] = punto2;
        
        const R = 6371000;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(deg) {
        return deg * Math.PI / 180;
    }

    // ============================================
    // CREAR VISUALIZACIÓN DE LA RUTA (OpenLayers)
    // ============================================
    crearRutaVisual(coords) {
        this.limpiarRutaVisual();
        
        const projectedCoords = coords.map(c => ol.proj.fromLonLat(c));
        
        this.routeSource = new ol.source.Vector();
        
        const lineFeature = new ol.Feature({
            geometry: new ol.geom.LineString(projectedCoords)
        });
        
        this.routeLayer = new ol.layer.Vector({
            source: this.routeSource,
            style: this.crearEstiloRuta()
        });
        
        this.routeSource.addFeature(lineFeature);
        this.agregarMarcadores(coords);
        
        map.addLayer(this.routeLayer);
        this.ajustarVistaRuta(projectedCoords);
        
        console.log('🗺️ Ruta visualizada en el mapa');
    }

    // ============================================
    // ESTILO DE LA RUTA
    // ============================================
    crearEstiloRuta() {
        return [
            new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#4285F4',
                    width: 5,
                    lineCap: 'round',
                    lineJoin: 'round'
                })
            }),
            new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'rgba(66, 133, 244, 0.3)',
                    width: 12,
                    lineCap: 'round',
                    lineJoin: 'round'
                })
            })
        ];
    }

    // ============================================
    // AGREGAR MARCADORES
    // ============================================
    agregarMarcadores(coords) {
        const inicio = coords[0];
        const inicioProj = ol.proj.fromLonLat(inicio);
        
        this.markerInicio = new ol.Feature({
            geometry: new ol.geom.Point(inicioProj)
        });
        
        this.markerInicio.setStyle(new ol.style.Style({
            image: new ol.style.Circle({
                radius: 12,
                fill: new ol.style.Fill({ color: '#34A853' }),
                stroke: new ol.style.Stroke({ color: '#FFFFFF', width: 3 })
            }),
            text: new ol.style.Text({
                text: '📍 Inicio',
                font: '12px Arial, sans-serif',
                fill: new ol.style.Fill({ color: '#333' }),
                stroke: new ol.style.Stroke({ color: '#FFFFFF', width: 2 }),
                offsetY: -20,
                textAlign: 'center'
            })
        }));
        
        this.routeSource.addFeature(this.markerInicio);
        
        const destino = coords[coords.length - 1];
        const destinoProj = ol.proj.fromLonLat(destino);
        
        this.markerDestino = new ol.Feature({
            geometry: new ol.geom.Point(destinoProj)
        });
        
        this.markerDestino.setStyle(new ol.style.Style({
            image: new ol.style.Circle({
                radius: 12,
                fill: new ol.style.Fill({ color: '#EA4335' }),
                stroke: new ol.style.Stroke({ color: '#FFFFFF', width: 3 })
            }),
            text: new ol.style.Text({
                text: '🏁 Destino',
                font: '12px Arial, sans-serif',
                fill: new ol.style.Fill({ color: '#333' }),
                stroke: new ol.style.Stroke({ color: '#FFFFFF', width: 2 }),
                offsetY: -20,
                textAlign: 'center'
            })
        }));
        
        this.routeSource.addFeature(this.markerDestino);
    }

    // ============================================
    // AJUSTAR VISTA
    // ============================================
    ajustarVistaRuta(coords) {
        if (coords.length === 0) return;
        const extent = ol.extent.boundingExtent(coords);
        map.getView().fit(ol.extent.buffer(extent, 50), {
            padding: [50, 50, 50, 50],
            duration: 1000,
            maxZoom: 18
        });
    }

    // ============================================
    // LIMPIAR RUTA VISUAL
    // ============================================
    limpiarRutaVisual() {
        if (this.routeLayer) {
            map.removeLayer(this.routeLayer);
            this.routeLayer = null;
        }
        if (this.routeSource) {
            this.routeSource.clear();
            this.routeSource = null;
        }
        this.markerInicio = null;
        this.markerDestino = null;
    }

    // ============================================
    // INICIAR SEGUIMIENTO
    // ============================================
    iniciarSeguimiento(intervalMs = 2000) {
        if (this.updateInterval) {
            this.detenerSeguimiento();
        }
        
        console.log('🔄 Iniciando seguimiento en tiempo real...');
        
        this.updateInterval = setInterval(() => {
            if (currentPosition && this.rutaActiva) {
                this.actualizarPosicionEnRuta(currentPosition);
            }
        }, intervalMs);
    }

    // ============================================
    // DETENER SEGUIMIENTO
    // ============================================
    detenerSeguimiento() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('⏹️ Seguimiento detenido');
        }
    }

// En actualizarPosicionEnRuta, calcula la velocidad REAL del usuario
actualizarPosicionEnRuta(posicion) {
    if (!this.rutaActiva || this.rutaCoords.length === 0) return;
    
    this.ultimaPosicion = posicion;
    
    // Calcular velocidad REAL basada en el movimiento
    if (this.ultimaPosicionReal) {
        const tiempo = (Date.now() - this.ultimoTiempo) / 1000;
        const distancia = this.calcularDistancia(
            [this.ultimaPosicionReal.lon, this.ultimaPosicionReal.lat],
            [posicion.lon, posicion.lat]
        );
        this.velocidadReal = distancia / tiempo;
    }
    
    this.ultimaPosicionReal = posicion;
    this.ultimoTiempo = Date.now();
    
    // Usar velocidad REAL para estimar tiempo restante
    const velocidad = this.velocidadReal || 1.4; // Fallback a 5 km/h
    
    const userLonLat = [posicion.lon, posicion.lat];
    let minDist = Infinity;
    
    this.rutaCoords.forEach((coord) => {
        const dist = this.calcularDistancia(userLonLat, coord);
        if (dist < minDist) minDist = dist;
    });
    
    const tiempoRestante = (this.distanciaTotal - minDist) / velocidad;
    
    // Notificar con tiempo realista
    if (this.callbacks.onRutaActualizada) {
        this.callbacks.onRutaActualizada({
            posicion: posicion,
            distanciaRestante: this.distanciaTotal - minDist,
            tiempoRestante: tiempoRestante,
            velocidadActual: velocidad * 3.6 // Convertir a km/h
        });
    }
}

    // ============================================
    // FINALIZAR RUTA
    // ============================================
    finalizarRuta() {
        console.log('🎯 ¡Has llegado a tu destino!');
        this.rutaActiva = false;
        this.detenerSeguimiento();
        
        if (this.callbacks.onRutaFinalizada) {
            this.callbacks.onRutaFinalizada(this);
        }
        
        this.mostrarNotificacionLlegada();
    }

    // ============================================
    // MOSTRAR NOTIFICACIÓN
    // ============================================
    mostrarNotificacionLlegada() {
        const notificacion = document.createElement('div');
        notificacion.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: #34A853;
            color: white;
            padding: 16px 32px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 9999;
            font-family: Arial, sans-serif;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            animation: slideUp 0.5s ease;
            max-width: 90%;
        `;
        notificacion.innerHTML = '🎉 ¡Has llegado a tu destino!';
        document.body.appendChild(notificacion);
        
        setTimeout(() => {
            notificacion.style.opacity = '0';
            notificacion.style.transition = 'opacity 0.5s';
            setTimeout(() => notificacion.remove(), 500);
        }, 5000);
    }

    // ============================================
    // CANCELAR RUTA
    // ============================================
    cancelarRuta() {
        console.log('❌ Cancelando ruta');
        this.rutaActiva = false;
        this.detenerSeguimiento();
        this.limpiarRutaVisual();
        this.rutaData = null;
        this.rutaCoords = [];
        this.instrucciones = [];
        this.currentStep = 0;
    }

    // ============================================
    // OBTENER INSTRUCCIÓN ACTUAL
    // ============================================
    getInstruccionActual() {
        if (this.currentStep < this.instrucciones.length) {
            return this.instrucciones[this.currentStep];
        }
        return null;
    }

    getSiguienteInstruccion() {
        if (this.currentStep + 1 < this.instrucciones.length) {
            return this.instrucciones[this.currentStep + 1];
        }
        return null;
    }

    // ============================================
    // EVENTOS
    // ============================================
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
    }
}

// ============================================
// CREAR INSTANCIA GLOBAL
// ============================================
const gestorRutas = new GestorRutas();
window.gestorRutas = gestorRutas;