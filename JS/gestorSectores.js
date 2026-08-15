// ============================================
// GESTOR DE SECTORES - CON CONTROL DE VERSIÓN
// ============================================
class GestorSectores {
    constructor() {
        this.sectores = {};
        this.version = '';
        this.ultimaActualizacion = '';
        this.cargado = false;
        this.callbacks = [];
        
        // Configuración del control de versión
        this.URL_VERSION = 'data/version.json';
        this.URL_DATOS = 'data/sectores.json';
    }

    // ============================================
    // MÉTODO PRINCIPAL - CON CONTROL DE VERSIÓN
    // ============================================
    async cargarDatos() {
        console.log('📂 Iniciando carga de datos con control de versión...');
        
        // PASO 1: Obtener la versión del servidor
        console.log('🔍 Verificando versión en el servidor...');
        const versionServidor = await this.obtenerVersionServidor();
        
        if (!versionServidor) {
            console.warn('⚠️ No se pudo obtener la versión del servidor. Usando datos locales...');
            // Si no hay conexión, usar datos locales si existen
            const locales = this.cargarDesdeLocalStorage();
            if (locales) {
                console.log('📦 Usando datos locales (sin verificación de versión)');
                this.sectores = locales.sectores;
                this.version = locales.version;
                this.ultimaActualizacion = locales.ultimaActualizacion;
                this.cargado = true;
                this.notificarCallbacks();
                return true;
            }
            return false;
        }
        
        console.log(`📌 Versión en servidor: ${versionServidor.version}`);
        
        // PASO 2: Cargar datos locales (caché)
        const datosLocales = this.cargarDesdeLocalStorage();
        
        if (datosLocales) {
            console.log(`📦 Caché local encontrada: versión ${datosLocales.version}`);
            
            // PASO 3: Comparar versiones
            if (datosLocales.version === versionServidor.version) {
                console.log('✅ Las versiones coinciden. Usando caché local (rápido) 🚀');
                this.sectores = datosLocales.sectores;
                this.version = datosLocales.version;
                this.ultimaActualizacion = datosLocales.ultimaActualizacion;
                this.cargado = true;
                this.notificarCallbacks();
                return true;
            } else {
                console.log(`🔄 Versión desactualizada!`);
                console.log(`   Local: ${datosLocales.version}`);
                console.log(`   Servidor: ${versionServidor.version}`);
                console.log(`   Descargando datos actualizados...`);
            }
        } else {
            console.log('📭 No hay caché local. Descargando datos por primera vez...');
        }
        
        // PASO 4: Descargar datos actualizados desde el servidor
        const cargado = await this.cargarDesdeJSON();
        if (cargado) {
            console.log(`✅ Datos actualizados descargados (versión ${this.version})`);
            
            // Guardar en caché para futuras cargas
            this.guardarEnLocalStorage();
            this.cargado = true;
            this.notificarCallbacks();
            
            // Mostrar notificación de actualización (opcional)
            this.mostrarNotificacionActualizacion(versionServidor);
            
            return true;
        }
        
        // PASO 5: Si todo falla, usar datos locales como fallback
        if (datosLocales) {
            console.warn('⚠️ Usando datos locales como fallback (versión antigua)');
            this.sectores = datosLocales.sectores;
            this.version = datosLocales.version;
            this.ultimaActualizacion = datosLocales.ultimaActualizacion;
            this.cargado = true;
            this.notificarCallbacks();
            return true;
        }
        
        console.error('❌ No se pudieron cargar los datos');
        return false;
    }

    // ============================================
    // OBTENER VERSIÓN DEL SERVIDOR
    // ============================================
    async obtenerVersionServidor() {
        try {
            // Intentar cargar version.json (archivo pequeño, rápido)
            console.log(`🔍 Intentando: ${this.URL_VERSION}`);
            
            // IMPORTANTE: cache: 'no-store' evita que el navegador guarde en caché este archivo
            const response = await fetch(this.URL_VERSION, { 
                cache: 'no-store'
            });
            
            if (!response.ok) {
                // Si version.json no existe, intentar leer la versión desde sectores.json
                console.warn('⚠️ No se encontró version.json, intentando leer desde sectores.json...');
                return this.obtenerVersionDesdeSectoresJSON();
            }
            
            const data = await response.json();
            
            // Validar que tenga los campos necesarios
            if (!data.version) {
                console.warn('⚠️ version.json no tiene campo "version"');
                return null;
            }
            
            console.log(`✅ Versión obtenida: ${data.version}`);
            return data;
            
        } catch (error) {
            console.warn('⚠️ Error al obtener versión:', error.message);
            return null;
        }
    }

    // ============================================
    // OBTENER VERSIÓN DESDE SECTORES.JSON (FALLBACK)
    // ============================================
    async obtenerVersionDesdeSectoresJSON() {
        try {
            const response = await fetch(this.URL_DATOS, { cache: 'no-store' });
            if (!response.ok) return null;
            
            const data = await response.json();
            if (!data.version) return null;
            
            console.log(`✅ Versión obtenida desde sectores.json: ${data.version}`);
            return {
                version: data.version,
                ultimaActualizacion: data.ultimaActualizacion
            };
        } catch (error) {
            return null;
        }
    }

    // ============================================
    // CARGAR DESDE LOCALSTORAGE
    // ============================================
    cargarDesdeLocalStorage() {
        try {
            const data = localStorage.getItem('sectores_data');
            if (!data) {
                console.log('📭 No hay datos en localStorage');
                return null;
            }

            const parsed = JSON.parse(data);
            
            // Verificar que los datos sean válidos
            if (!parsed.sectores || !parsed.version) {
                console.warn('⚠️ Datos en localStorage corruptos');
                return null;
            }

            // Verificar que tenga fecha de caché
            if (!parsed.fechaCache) {
                console.warn('⚠️ Datos antiguos sin fecha de caché');
                // Si no tiene fecha, la agregamos ahora
                parsed.fechaCache = new Date().toISOString();
                localStorage.setItem('sectores_data', JSON.stringify(parsed));
            }

            console.log(`📦 Caché encontrada: ${Object.keys(parsed.sectores).length} sectores (versión ${parsed.version})`);
            return parsed;
        } catch (error) {
            console.warn('⚠️ Error al leer localStorage:', error);
            return null;
        }
    }

    // ============================================
    // CARGAR DESDE JSON
    // ============================================
    async cargarDesdeJSON() {
        try {
            console.log('🔄 Descargando datos desde JSON...');
            
            const response = await fetch(this.URL_DATOS, { 
                cache: 'no-store' // No usar caché del navegador
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Validar estructura
            if (!data.sectores) {
                throw new Error('Estructura JSON inválida: falta "sectores"');
            }

            this.sectores = data.sectores;
            this.version = data.version || '1.0.0';
            this.ultimaActualizacion = data.ultimaActualizacion || new Date().toISOString().split('T')[0];
            
            const count = Object.keys(this.sectores).length;
            console.log(`✅ JSON descargado: ${count} sectores (versión ${this.version})`);
            
            return true;
        } catch (error) {
            console.error('❌ Error al cargar JSON:', error);
            return false;
        }
    }

    // ============================================
    // GUARDAR EN LOCALSTORAGE (CON VERSIÓN)
    // ============================================
    guardarEnLocalStorage() {
        try {
            const data = {
                version: this.version,
                ultimaActualizacion: this.ultimaActualizacion,
                sectores: this.sectores,
                fechaCache: new Date().toISOString()
            };
            
            localStorage.setItem('sectores_data', JSON.stringify(data));
            
            // También guardar la versión por separado para acceso rápido
            localStorage.setItem('sectores_version', this.version);
            localStorage.setItem('sectores_ultima_actualizacion', this.ultimaActualizacion);
            
            console.log(`💾 Datos guardados en caché (versión ${this.version})`);
            return true;
        } catch (error) {
            console.warn('⚠️ No se pudo guardar en localStorage:', error);
            return false;
        }
    }

    // ============================================
    // MOSTRAR NOTIFICACIÓN DE ACTUALIZACIÓN
    // ============================================
    mostrarNotificacionActualizacion(versionServidor) {
        // Mostrar notificación discreta al usuario
        const mensaje = versionServidor.cambios ? 
            `📢 Datos actualizados: ${versionServidor.cambios}` : 
            `📢 Datos actualizados a versión ${versionServidor.version}`;
        
        console.log(`📢 ${mensaje}`);
        
        // Crear notificación en la interfaz (opcional)
        const notificacion = document.createElement('div');
        notificacion.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 9999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            animation: slideUp 0.5s ease;
            max-width: 90%;
            text-align: center;
        `;
        notificacion.textContent = mensaje;
        document.body.appendChild(notificacion);
        
        // Eliminar después de 5 segundos
        setTimeout(() => {
            notificacion.style.opacity = '0';
            notificacion.style.transition = 'opacity 0.5s';
            setTimeout(() => notificacion.remove(), 500);
        }, 5000);
    }

    // ============================================
    // RECARGAR MANUALMENTE
    // ============================================
    async recargar() {
        console.log('🔄 Recargando datos manualmente...');
        this.limpiarCache();
        return await this.cargarDesdeJSON();
    }

    // ============================================
    // LIMPIAR CACHÉ
    // ============================================
    limpiarCache() {
        localStorage.removeItem('sectores_data');
        localStorage.removeItem('sectores_version');
        localStorage.removeItem('sectores_ultima_actualizacion');
        console.log('🧹 Caché limpiada');
    }

    // ============================================
    // OBTENER DATOS
    // ============================================
    getSector(id) {
        return this.sectores[id] || null;
    }

    getTodosSectores() {
        return this.sectores;
    }

    getListaSectores() {
        return Object.keys(this.sectores).map(id => ({
            id: id,
            ...this.sectores[id]
        }));
    }

    // ============================================
    // EVENTOS
    // ============================================
    onCambio(callback) {
        this.callbacks.push(callback);
    }

    notificarCallbacks() {
        this.callbacks.forEach(callback => {
            try {
                callback(this.sectores);
            } catch (error) {
                console.error('❌ Error en callback:', error);
            }
        });
    }
}

// ============================================
// CREAR INSTANCIA GLOBAL
// ============================================
const gestorSectores = new GestorSectores();
window.gestorSectores = gestorSectores;