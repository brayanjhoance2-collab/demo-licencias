"use server"
import db from "@/_DB/db"
import bcrypt from 'bcryptjs'

export async function crearAdministradorInicial() {
    try {
        // Obtener credenciales del .env
        const adminEmail = process.env.ADMIN_EMAIL
        const adminPassword = process.env.ADMIN_PASSWORD
        const adminNombre = process.env.ADMIN_NOMBRE || 'Super Administrador'
        const adminTelefono = process.env.ADMIN_TELEFONO || null
        
        // Verificar que estén configuradas
        if (!adminEmail || !adminPassword) {
            return {
                success: false,
                creado: false,
                mensaje: 'Variables ADMIN_EMAIL y ADMIN_PASSWORD no configuradas en .env'
            }
        }
        
        // Verificar que existe el rol de Administrador (no puede ser modificado)
        const [rolAdmin] = await db.query(`
            SELECT id_rol, nombre_rol, es_modificable 
            FROM roles 
            WHERE nombre_rol = 'Administrador'
        `)
        
        if (rolAdmin.length === 0) {
            return {
                success: false,
                creado: false,
                mensaje: 'El rol Administrador no existe en la base de datos. Ejecuta el script SQL completo.'
            }
        }
        
        // Verificar si ya existe algún administrador activo
        const [adminExistente] = await db.query(`
            SELECT COUNT(*) as total 
            FROM administradores 
            WHERE activo = 1
        `)
        
        if (adminExistente[0].total > 0) {
            return {
                success: true,
                creado: false,
                mensaje: 'Ya existe un administrador activo en el sistema'
            }
        }
        
        // Verificar si existe el administrador con el email del .env
        const [adminPorEmail] = await db.query(`
            SELECT id_admin, activo FROM administradores WHERE email = ?
        `, [adminEmail])
        
        let adminId
        
        if (adminPorEmail.length > 0) {
            // El administrador ya existe, solo activar y actualizar
            adminId = adminPorEmail[0].id_admin
            
            const contrasenaHash = await bcrypt.hash(adminPassword, 12)
            
            await db.query(`
                UPDATE administradores 
                SET 
                    nombre_completo = ?,
                    telefono = ?,
                    password_hash = ?,
                    activo = 1,
                    ultima_sesion = NULL
                WHERE id_admin = ?
            `, [adminNombre, adminTelefono, contrasenaHash, adminId])
            
            // Registrar acción en historial
            await db.query(`
                INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, id_registro_afectado, detalles)
                VALUES (?, 'REACTIVACION', 'administradores', ?, 'Administrador reactivado desde .env')
            `, [adminId, adminId])
            
            return {
                success: true,
                creado: true,
                mensaje: 'Administrador existente actualizado y reactivado exitosamente',
                datos: {
                    id_admin: adminId,
                    email: adminEmail,
                    nombre: adminNombre,
                    rol: 'Administrador'
                }
            }
        } else {
            // Crear el administrador desde cero
            const contrasenaHash = await bcrypt.hash(adminPassword, 12)
            
            const [resultadoAdmin] = await db.query(`
                INSERT INTO administradores (
                    nombre_completo,
                    email,
                    telefono,
                    password_hash,
                    activo,
                    fecha_registro,
                    creado_por
                ) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, NULL)
            `, [
                adminNombre,
                adminEmail,
                adminTelefono,
                contrasenaHash
            ])
            
            adminId = resultadoAdmin.insertId
            
            // Registrar creación en historial
            await db.query(`
                INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, id_registro_afectado, detalles)
                VALUES (?, 'CREATE', 'administradores', ?, 'Administrador inicial creado desde .env')
            `, [adminId, adminId])
            
            // Crear notificación de bienvenida
            await db.query(`
                INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
                VALUES ('administrador', ?, 'Bienvenido al Sistema', 'Has sido registrado como Super Administrador del sistema de licencias', 'info')
            `, [adminId])
            
            return {
                success: true,
                creado: true,
                mensaje: 'Super Administrador creado exitosamente',
                datos: {
                    id_admin: adminId,
                    email: adminEmail,
                    nombre: adminNombre,
                    rol: 'Administrador'
                }
            }
        }
        
    } catch (error) {
        console.error('Error al crear administrador inicial:', error)
        
        return {
            success: false,
            creado: false,
            mensaje: 'Error al crear administrador inicial: ' + error.message,
            error: error.message
        }
    }
}

export async function obtenerConfigAdministrador() {
    try {
        // Verificar que existe el rol de Administrador
        const [rolAdmin] = await db.query(`
            SELECT id_rol, nombre_rol, es_modificable 
            FROM roles 
            WHERE nombre_rol = 'Administrador'
        `)
        
        if (rolAdmin.length === 0) {
            return {
                adminEmail: process.env.ADMIN_EMAIL || '',
                configurado: false,
                existeRol: false,
                existeAdmin: false,
                mensaje: 'El rol Administrador no existe. Ejecuta el script SQL.'
            }
        }
        
        // Contar administradores activos
        const [adminsActivos] = await db.query(`
            SELECT COUNT(*) as total 
            FROM administradores 
            WHERE activo = 1
        `)
        
        // Obtener información del primer admin
        const [primerAdmin] = await db.query(`
            SELECT id_admin, nombre_completo, email, fecha_registro
            FROM administradores
            WHERE activo = 1
            ORDER BY fecha_registro ASC
            LIMIT 1
        `)
        
        return {
            adminEmail: process.env.ADMIN_EMAIL || '',
            configurado: !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD),
            existeRol: true,
            existeAdmin: adminsActivos[0].total > 0,
            totalAdmins: adminsActivos[0].total,
            primerAdmin: primerAdmin.length > 0 ? {
                nombre: primerAdmin[0].nombre_completo,
                email: primerAdmin[0].email,
                fecha_registro: primerAdmin[0].fecha_registro
            } : null
        }
    } catch (error) {
        console.error('Error al obtener config administrador:', error)
        return {
            adminEmail: process.env.ADMIN_EMAIL || '',
            configurado: false,
            existeRol: false,
            existeAdmin: false,
            error: error.message
        }
    }
}

export async function verificarSistema() {
    try {
        // Verificar roles
        const [roles] = await db.query(`
            SELECT id_rol, nombre_rol, es_modificable 
            FROM roles
            ORDER BY id_rol
        `)
        
        const rolesExistentes = roles.map(r => r.nombre_rol)
        const rolesFaltantes = []
        
        if (!rolesExistentes.includes('Administrador')) {
            rolesFaltantes.push('Administrador')
        }
        if (!rolesExistentes.includes('Usuario')) {
            rolesFaltantes.push('Usuario')
        }
        
        // Contar administradores
        const [admins] = await db.query(`
            SELECT COUNT(*) as total FROM administradores WHERE activo = 1
        `)
        
        // Contar usuarios
        const [usuarios] = await db.query(`
            SELECT COUNT(*) as total FROM usuarios WHERE activo = 1
        `)
        
        // Contar licencias activas
        const [licencias] = await db.query(`
            SELECT COUNT(*) as total FROM licencias WHERE activa = 1
        `)
        
        // Obtener configuraciones
        const [configs] = await db.query(`
            SELECT COUNT(*) as total FROM configuracion_sistema
        `)
        
        // Verificar datos de empresa
        const [empresa] = await db.query(`
            SELECT COUNT(*) as total FROM datos_empresa WHERE activo = 1
        `)
        
        return {
            success: true,
            rolesOk: rolesFaltantes.length === 0,
            rolesFaltantes,
            rolesExistentes: roles.map(r => ({
                nombre: r.nombre_rol,
                modificable: r.es_modificable
            })),
            totalAdministradores: admins[0].total,
            totalUsuarios: usuarios[0].total,
            totalLicencias: licencias[0].total,
            totalConfiguraciones: configs[0].total,
            tieneEmpresa: empresa[0].total > 0,
            sistemaListo: rolesFaltantes.length === 0 && admins[0].total > 0
        }
    } catch (error) {
        console.error('Error al verificar sistema:', error)
        return {
            success: false,
            error: error.message,
            sistemaListo: false
        }
    }
}

export async function obtenerEstadisticasSistema() {
    try {
        // Estadísticas generales
        const [stats] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM administradores WHERE activo = 1) as admins_activos,
                (SELECT COUNT(*) FROM usuarios WHERE activo = 1) as usuarios_activos,
                (SELECT COUNT(*) FROM licencias WHERE activa = 1) as licencias_activas,
                (SELECT COUNT(*) FROM licencias WHERE activa = 1 AND fecha_vencimiento < CURDATE()) as licencias_vencidas,
                (SELECT COUNT(*) FROM licencias WHERE activa = 1 AND DATEDIFF(fecha_vencimiento, CURDATE()) <= 7) as licencias_por_vencer,
                (SELECT COUNT(*) FROM notificaciones WHERE leida = 0) as notificaciones_pendientes
        `)
        
        return {
            success: true,
            estadisticas: stats[0]
        }
    } catch (error) {
        console.error('Error al obtener estadísticas:', error)
        return {
            success: false,
            error: error.message
        }
    }
}