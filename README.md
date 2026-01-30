# LitAgents - Sistema de Orquestacion de Agentes Literarios IA

Sistema autonomo de orquestacion de agentes de IA para la escritura, edicion y produccion de novelas completas.

## Caracteristicas Principales

- **Generador de Novelas (LitAgents 2.0)**: Pipeline basado en escenas con 6 agentes especializados
- **Re-editor de Manuscritos (LitEditors)**: Editor de desarrollo con auditoria forense de consistencia
- **Traductor de Novelas (LitTranslators 2.0)**: Sistema de traduccion literaria con revision nativa
- **World Bible**: Base de datos de consistencia para personajes, ubicaciones y reglas del mundo
- **Seguimiento de Costos**: Tracking granular de uso de tokens por proyecto
- **Autenticacion**: Proteccion con contrasena para instalaciones en servidor propio

## Novedades v2.1

### Native Beta Reader (Revisor Nativo)
- **Revision como hablante nativo**: Analiza traducciones desde la perspectiva de un lector nativo del idioma destino
- **Soporte multi-idioma**: Espanol, Ingles, Frances, Aleman, Italiano, Portugues, Catalan
- **Feedback por genero literario**: Expectativas especificas para Romance, Fantasia, Misterio, Thriller, Ciencia Ficcion, Horror, Literaria, Historica
- **Correcciones automaticas**: Aplica correcciones directamente al texto traducido
- **Panel de resumen**: Muestra puntuaciones de calidad, fluidez, genero y adaptacion cultural

### Sistema de Autenticacion
- **Proteccion con contrasena**: Configurable durante la instalacion
- **Sesiones seguras**: Cookies HTTPOnly con expiracion de 24 horas
- **Desactivable en Replit**: Se desactiva automaticamente cuando se ejecuta en Replit

### Mejoras en el Generador (LitAgents 2.1)
- **Modulo de Consistencia Universal**: Inyeccion de restricciones antes de la planificacion Y escritura
- **Guardian de Consistencia**: Validacion despues de cada capitulo con reescritura forzada si hay violaciones
- **Zero-tolerance rewrites**: El sistema garantiza que no se produzcan errores de continuidad

### Mejoras en el Re-editor (LitEditors)
- **Forensic Consistency Auditor**: Detecta errores de consistencia existentes en manuscritos
- **Beta Reader comercial**: Analisis de viabilidad comercial con comparaciones de mercado

## Agentes del Sistema

### Generador (LitAgents 2.0)
| Agente | Funcion |
|--------|---------|
| Global Architect | Planificacion de estructura narrativa |
| Chapter Architect | Diseno de escenas por capitulo (recibe restricciones de consistencia) |
| Ghostwriter V2 | Escritura creativa de escenas (recibe restricciones de consistencia) |
| Smart Editor | Edicion y refinamiento |
| Summarizer | Generacion de resumenes |
| Narrative Director | Control de coherencia narrativa |

### Re-editor (LitEditors)
| Agente | Funcion |
|--------|---------|
| Forensic Consistency Auditor | Deteccion de errores de consistencia |
| Beta Reader | Analisis de viabilidad comercial |
| Copyeditor | Correccion de estilo |
| Final Reviewer | Evaluacion final |

### Traductor (LitTranslators 2.0)
| Agente | Funcion |
|--------|---------|
| Strategist | Analisis de estilo y tipografia |
| Drafter | Traduccion inicial preservando contexto |
| Proofreader | Revision y correccion |
| Native Beta Reader | Revision como hablante nativo con feedback por genero |

## Requisitos del Sistema

- Ubuntu 22.04 / 24.04 LTS
- 4GB RAM minimo (8GB recomendado)
- 20GB espacio en disco
- Conexion a internet

## Preparacion del Servidor Ubuntu

Antes de instalar LitAgents, asegurate de que tu servidor Ubuntu este actualizado.

### Actualizar el sistema

```bash
# Actualizar lista de paquetes
sudo apt update

# Actualizar todos los paquetes instalados
sudo apt upgrade -y

# (Opcional) Actualizar el sistema completo incluyendo kernel
sudo apt full-upgrade -y

# Limpiar paquetes obsoletos
sudo apt autoremove -y
```

### Instalar herramientas necesarias

```bash
# Instalar curl, git y otras herramientas basicas
sudo apt install -y curl git wget nano build-essential

# Verificar instalacion
curl --version
git --version
```

## Instalacion Rapida

### 1. Descargar e instalar

```bash
# Clonar repositorio
git clone https://github.com/atreyu1968/escritorasdgemini.git
cd escritorasdgemini

# Ejecutar instalador
sudo bash install.sh
```

### 2. Durante la instalacion

El instalador te pedira las siguientes configuraciones:

**Google Gemini (Principal)**
- `GEMINI_API_KEY`: API key de Google Gemini para todos los agentes

**DeepSeek (Opcional - 3 claves separadas para gestion de cuotas)**
- `DEEPSEEK_API_KEY`: Para generacion de novelas
- `DEEPSEEK_TRANSLATOR_API_KEY`: Para traduccion de manuscritos

**Otras opciones:**
- `Cloudflare Tunnel Token`: Para acceso HTTPS externo (opcional)

### 3. Acceder a la aplicacion

```
http://TU_IP_SERVIDOR
```

Si configuraste una contrasena, veras una pantalla de login antes de acceder.

## Configuracion Manual de API Keys

Si omitiste las claves durante la instalacion:

```bash
# Editar configuracion
sudo nano /etc/litagents/env

# Agregar/modificar estas lineas:
GEMINI_API_KEY=tu_clave_gemini
DEEPSEEK_API_KEY=tu_clave_deepseek
DEEPSEEK_TRANSLATOR_API_KEY=tu_clave_traductor

# Guardar y salir (Ctrl+O, Enter, Ctrl+X)

# Reiniciar servicio
sudo systemctl restart litagents
```

## Obtener API Keys

### Google Gemini (Principal)
1. Visita https://aistudio.google.com/apikey
2. Crea un proyecto y habilita la API
3. Genera una API key

### DeepSeek (Opcional)
1. Visita https://platform.deepseek.com/
2. Crea una cuenta y agrega creditos
3. Genera una API key

## Comandos de Administracion

```bash
# Ver estado del servicio
systemctl status litagents

# Ver logs en tiempo real
journalctl -u litagents -f

# Reiniciar servicio
sudo systemctl restart litagents

# Detener servicio
sudo systemctl stop litagents

# Iniciar servicio
sudo systemctl start litagents
```

## Actualizacion

Para actualizar a la ultima version:

```bash
cd /var/www/litagents
sudo bash install.sh
```

El instalador detectara la instalacion existente y preservara:
- Credenciales de base de datos
- API keys configuradas
- Proyectos existentes

## Estructura de Archivos

```
/var/www/litagents/                    # Codigo de la aplicacion
/etc/litagents/env                     # Configuracion y variables de entorno
/etc/systemd/system/litagents.service  # Servicio systemd
/etc/nginx/sites-available/litagents   # Configuracion Nginx
```

## Acceso Externo con Cloudflare Tunnel

Si necesitas acceso externo con HTTPS:

1. Crea un tunel en https://one.dash.cloudflare.com/
2. Obten el token del tunel
3. Ejecuta el instalador y proporciona el token
4. Configura el hostname del tunel apuntando a `http://localhost:5000`

## Solucion de Problemas

### El servicio no inicia

```bash
# Ver logs de error
journalctl -u litagents -n 50

# Verificar configuracion
cat /etc/litagents/env

# Verificar PostgreSQL
systemctl status postgresql
```

### Error de conexion a base de datos

```bash
# Verificar que PostgreSQL esta corriendo
sudo systemctl start postgresql

# Probar conexion manual
sudo -u postgres psql -c "\l"
```

### Login no funciona

Si usas Cloudflare Tunnel, verifica que `SECURE_COOKIES=true` esta configurado.
Sin HTTPS, debe ser `SECURE_COOKIES=false`.

### Permisos de archivos

```bash
# Reparar permisos
sudo chown -R litagents:litagents /var/www/litagents
```

## Variables de Entorno

| Variable | Descripcion | Requerido |
|----------|-------------|-----------|
| `DATABASE_URL` | URL de conexion PostgreSQL | Si (auto) |
| `SESSION_SECRET` | Secreto para sesiones | Si (auto) |
| `GEMINI_API_KEY` | API key de Google Gemini | Si |
| `DEEPSEEK_API_KEY` | API key de DeepSeek | Opcional |
| `DEEPSEEK_TRANSLATOR_API_KEY` | API key de DeepSeek - Traductor | Opcional |
| `SECURE_COOKIES` | true/false para cookies seguras | Si (auto) |
| `PORT` | Puerto de la aplicacion | Si (auto: 5000) |

## Backup de Base de Datos

```bash
# Usar script incluido
sudo /var/www/litagents/backup.sh

# O manualmente
sudo -u postgres pg_dump litagents_db > backup_$(date +%Y%m%d).sql

# Restaurar backup
sudo -u postgres psql litagents_db < backup_20240101.sql
```

## Desinstalacion

```bash
# Detener y deshabilitar servicio
sudo systemctl stop litagents
sudo systemctl disable litagents

# Eliminar archivos
sudo rm -rf /var/www/litagents
sudo rm -rf /etc/litagents
sudo rm /etc/systemd/system/litagents.service
sudo rm /etc/nginx/sites-enabled/litagents
sudo rm /etc/nginx/sites-available/litagents

# Eliminar base de datos (opcional)
sudo -u postgres psql -c "DROP DATABASE litagents_db;"
sudo -u postgres psql -c "DROP USER litagents;"

# Recargar servicios
sudo systemctl daemon-reload
sudo systemctl restart nginx
```

## Stack Tecnologico

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Base de datos**: PostgreSQL + Drizzle ORM
- **IA**: Google Gemini API (principal), DeepSeek (opcional)
- **Proxy**: Nginx
- **Proceso**: systemd

## Licencia

MIT License

## Soporte

Para reportar problemas o solicitar funciones, abre un issue en el repositorio de GitHub:
https://github.com/atreyu1968/escritorasdgemini
