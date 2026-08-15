// ============================================
// GESTOR DE GASOLINERAS - JSON + LocalStorage
// ============================================
class GestorGasolineras {
    constructor() {
        this.gasolineras = {};
        this.version = '';
        this.ultimaActualizacion = '';
        this.cargado = false;
        this.callbacks = [];
        
        this.URL_VERSION = 'data/gasolineras_version.json';
        this.URL_DATOS = 'data/gasolineras.json';
    }

    async cargarDatos() {
        console.log('⛽ Iniciando carga de gasolineras...');
        
        const versionServidor = await this.obtenerVersionServidor();
        
        if (!versionServidor) {
            const locales = this.cargarDesdeLocalStorage();
            if (locales) {
                console.log('📦 Usando gasolineras locales (sin verificación)');
                this.gasolineras = locales.gasolineras;
                this.version = locales.version;
                this.ultimaActualizacion = locales.ultimaActualizacion;
                this.cargado = true;
                this.notificarCallbacks();
                return true;
            }
            return false;
        }
        
        console.log(`📌 Versión gasolineras en servidor: ${versionServidor.version}`);
        const datosLocales = this.cargarDesdeLocalStorage();
        
        if (datosLocales) {
            if (datosLocales.version === versionServidor.version) {
                console.log('✅ Versión gasolineras coincide. Usando caché local 🚀');
                this.gasolineras = datosLocales.gasolineras;
                this.version = datosLocales.version;
                this.ultimaActualizacion = datosLocales.ultimaActualizacion;
                this.cargado = true;
                this.notificarCallbacks();
                return true;
            } else {
                console.log(`🔄 Versión gasolineras desactualizada!`);
            }
        }
        
        const cargado = await this.cargarDesdeJSON();
        if (cargado) {
            console.log(`✅ Gasolineras actualizadas (versión ${this.version})`);
            this.guardarEnLocalStorage();
            this.cargado = true;
            this.notificarCallbacks();
            return true;
        }
        
        if (datosLocales) {
            console.warn('⚠️ Usando gasolineras locales como fallback');
            this.gasolineras = datosLocales.gasolineras;
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
            const data = localStorage.getItem('gasolineras_data');
            if (!data) return null;
            const parsed = JSON.parse(data);
            if (!parsed.gasolineras || !parsed.version) return null;
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
            this.gasolineras = data.gasolineras;
            this.version = data.version || '1.0.0';
            this.ultimaActualizacion = data.ultimaActualizacion || new Date().toISOString().split('T')[0];
            return true;
        } catch (error) {
            console.error('❌ Error al cargar gasolineras:', error);
            return false;
        }
    }

    guardarEnLocalStorage() {
        try {
            const data = {
                version: this.version,
                ultimaActualizacion: this.ultimaActualizacion,
                gasolineras: this.gasolineras,
                fechaCache: new Date().toISOString()
            };
            localStorage.setItem('gasolineras_data', JSON.stringify(data));
            return true;
        } catch (error) {
            return false;
        }
    }

    getGasolinera(id) {
        return this.gasolineras[id] || null;
    }

    getTodasGasolineras() {
        return this.gasolineras;
    }

    getListaGasolineras() {
        return Object.keys(this.gasolineras).map(id => ({
            id: id,
            ...this.gasolineras[id]
        }));
    }

    onCambio(callback) {
        this.callbacks.push(callback);
    }

    notificarCallbacks() {
        this.callbacks.forEach(callback => {
            try {
                callback(this.gasolineras);
            } catch (error) {
                console.error('❌ Error en callback gasolineras:', error);
            }
        });
    }
}

const gestorGasolineras = new GestorGasolineras();
window.gestorGasolineras = gestorGasolineras;