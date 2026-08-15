// ============================================
// GESTOR DE GIMNASIOS - JSON + LocalStorage
// ============================================
class GestorGimnasios {
    constructor() {
        this.gimnasios = {};
        this.version = '';
        this.ultimaActualizacion = '';
        this.cargado = false;
        this.callbacks = [];
        
        this.URL_VERSION = 'data/gimnasios_version.json';
        this.URL_DATOS = 'data/gimnasios.json';
    }

    async cargarDatos() {
        console.log('💪 Iniciando carga de gimnasios...');
        
        const versionServidor = await this.obtenerVersionServidor();
        
        if (!versionServidor) {
            const locales = this.cargarDesdeLocalStorage();
            if (locales) {
                console.log('📦 Usando gimnasios locales (sin verificación)');
                this.gimnasios = locales.gimnasios;
                this.version = locales.version;
                this.ultimaActualizacion = locales.ultimaActualizacion;
                this.cargado = true;
                this.notificarCallbacks();
                return true;
            }
            return false;
        }
        
        console.log(`📌 Versión gimnasios en servidor: ${versionServidor.version}`);
        const datosLocales = this.cargarDesdeLocalStorage();
        
        if (datosLocales) {
            if (datosLocales.version === versionServidor.version) {
                console.log('✅ Versión gimnasios coincide. Usando caché local 🚀');
                this.gimnasios = datosLocales.gimnasios;
                this.version = datosLocales.version;
                this.ultimaActualizacion = datosLocales.ultimaActualizacion;
                this.cargado = true;
                this.notificarCallbacks();
                return true;
            } else {
                console.log(`🔄 Versión gimnasios desactualizada!`);
            }
        }
        
        const cargado = await this.cargarDesdeJSON();
        if (cargado) {
            console.log(`✅ Gimnasios actualizados (versión ${this.version})`);
            this.guardarEnLocalStorage();
            this.cargado = true;
            this.notificarCallbacks();
            return true;
        }
        
        if (datosLocales) {
            console.warn('⚠️ Usando gimnasios locales como fallback');
            this.gimnasios = datosLocales.gimnasios;
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
            const data = localStorage.getItem('gimnasios_data');
            if (!data) return null;
            const parsed = JSON.parse(data);
            if (!parsed.gimnasios || !parsed.version) return null;
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
            this.gimnasios = data.gimnasios;
            this.version = data.version || '1.0.0';
            this.ultimaActualizacion = data.ultimaActualizacion || new Date().toISOString().split('T')[0];
            return true;
        } catch (error) {
            console.error('❌ Error al cargar gimnasios:', error);
            return false;
        }
    }

    guardarEnLocalStorage() {
        try {
            const data = {
                version: this.version,
                ultimaActualizacion: this.ultimaActualizacion,
                gimnasios: this.gimnasios,
                fechaCache: new Date().toISOString()
            };
            localStorage.setItem('gimnasios_data', JSON.stringify(data));
            return true;
        } catch (error) {
            return false;
        }
    }

    getGimnasio(id) {
        return this.gimnasios[id] || null;
    }

    getTodosGimnasios() {
        return this.gimnasios;
    }

    getListaGimnasios() {
        return Object.keys(this.gimnasios).map(id => ({
            id: id,
            ...this.gimnasios[id]
        }));
    }

    onCambio(callback) {
        this.callbacks.push(callback);
    }

    notificarCallbacks() {
        this.callbacks.forEach(callback => {
            try {
                callback(this.gimnasios);
            } catch (error) {
                console.error('❌ Error en callback gimnasios:', error);
            }
        });
    }
}

const gestorGimnasios = new GestorGimnasios();
window.gestorGimnasios = gestorGimnasios;