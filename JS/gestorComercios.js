// ============================================
// GESTOR DE COMERCIOS - JSON + LocalStorage
// ============================================
class GestorComercios {
    constructor() {
        this.centros = {};
        this.version = '';
        this.ultimaActualizacion = '';
        this.cargado = false;
        this.callbacks = [];
        
        this.URL_VERSION = 'data/comercios_version.json';
        this.URL_DATOS = 'data/comercios.json';
    }

    async cargarDatos() {
        console.log('📂 Iniciando carga de comercios...');
        
        const versionServidor = await this.obtenerVersionServidor();
        
        if (!versionServidor) {
            const locales = this.cargarDesdeLocalStorage();
            if (locales) {
                console.log('📦 Usando comercios locales (sin verificación)');
                this.centros = locales.centros;
                this.version = locales.version;
                this.ultimaActualizacion = locales.ultimaActualizacion;
                this.cargado = true;
                this.notificarCallbacks();
                return true;
            }
            return false;
        }
        
        console.log(`📌 Versión comercios en servidor: ${versionServidor.version}`);
        const datosLocales = this.cargarDesdeLocalStorage();
        
        if (datosLocales) {
            if (datosLocales.version === versionServidor.version) {
                console.log('✅ Versión comercios coincide. Usando caché local 🚀');
                this.centros = datosLocales.centros;
                this.version = datosLocales.version;
                this.ultimaActualizacion = datosLocales.ultimaActualizacion;
                this.cargado = true;
                this.notificarCallbacks();
                return true;
            } else {
                console.log(`🔄 Versión comercios desactualizada!`);
            }
        }
        
        const cargado = await this.cargarDesdeJSON();
        if (cargado) {
            console.log(`✅ Comercios actualizados (versión ${this.version})`);
            this.guardarEnLocalStorage();
            this.cargado = true;
            this.notificarCallbacks();
            return true;
        }
        
        if (datosLocales) {
            console.warn('⚠️ Usando comercios locales como fallback');
            this.centros = datosLocales.centros;
            this.version = datosLocales.version;
            this.ultimaActualizacion = datosLocales.ultimaActualizacion;
            this.cargado = true;
            this.notificarCallbacks();
            return true;
        }
        
        return false;
    }

    async obtenerVersionServidor() {
        try {
            const response = await fetch(this.URL_VERSION, { cache: 'no-store' });
            if (!response.ok) return null;
            const data = await response.json();
            return data;
        } catch (error) {
            return null;
        }
    }

    cargarDesdeLocalStorage() {
        try {
            const data = localStorage.getItem('comercios_data');
            if (!data) return null;
            const parsed = JSON.parse(data);
            if (!parsed.centros || !parsed.version) return null;
            return parsed;
        } catch (error) {
            return null;
        }
    }

    async cargarDesdeJSON() {
        try {
            const response = await fetch(this.URL_DATOS, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            this.centros = data.centros;
            this.version = data.version || '1.0.0';
            this.ultimaActualizacion = data.ultimaActualizacion || new Date().toISOString().split('T')[0];
            return true;
        } catch (error) {
            console.error('❌ Error al cargar comercios:', error);
            return false;
        }
    }

    guardarEnLocalStorage() {
        try {
            const data = {
                version: this.version,
                ultimaActualizacion: this.ultimaActualizacion,
                centros: this.centros,
                fechaCache: new Date().toISOString()
            };
            localStorage.setItem('comercios_data', JSON.stringify(data));
            return true;
        } catch (error) {
            return false;
        }
    }

    getCentro(id) {
        return this.centros[id] || null;
    }

    getTodosCentros() {
        return this.centros;
    }

    getListaCentros() {
        return Object.keys(this.centros).map(id => ({
            id: id,
            ...this.centros[id]
        }));
    }

    onCambio(callback) {
        this.callbacks.push(callback);
    }

    notificarCallbacks() {
        this.callbacks.forEach(callback => {
            try {
                callback(this.centros);
            } catch (error) {
                console.error('❌ Error en callback comercios:', error);
            }
        });
    }
}

const gestorComercios = new GestorComercios();
window.gestorComercios = gestorComercios;