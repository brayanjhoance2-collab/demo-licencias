"use server"
import db from "@/_DB/db"
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_cambiarla'

async function verificarAdmin() {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')

    if (!token || !token.value) {
        return null
    }

    try {
        const decoded = jwt.verify(token.value, JWT_SECRET)
        if (decoded.tipo !== 'administrador') {
            return null
        }
        return decoded
    } catch (error) {
        console.log('Error al verificar token:', error)
        return null
    }
}

export async function obtenerLicencias(filtro = 'todas', busqueda = '') {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        let whereConditions = []
        let queryParams = []

        if (busqueda && busqueda.trim() !== '') {
            whereConditions.push(`(
                u.nombre_completo LIKE ? OR 
                u.email LIKE ? OR 
                l.codigo_licencia LIKE ?
            )`)
            const searchTerm = `%${busqueda.trim()}%`
            queryParams.push(searchTerm, searchTerm, searchTerm)
        }

        switch (filtro) {
            case 'activas':
                whereConditions.push('l.activa = 1')
                whereConditions.push('l.fecha_vencimiento >= CURDATE()')
                break
            case 'por-vencer':
                whereConditions.push('l.activa = 1')
                whereConditions.push('DATEDIFF(l.fecha_vencimiento, CURDATE()) <= 7')
                whereConditions.push('DATEDIFF(l.fecha_vencimiento, CURDATE()) >= 0')
                break
            case 'vencidas':
                whereConditions.push('l.fecha_vencimiento < CURDATE()')
                break
            case 'inactivas':
                whereConditions.push('l.activa = 0')
                break
            case 'todas':
            default:
                break
        }

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : ''

        const query = `
            SELECT 
                l.id_licencia,
                l.codigo_licencia,
                l.tipo_licencia,
                l.fecha_inicio,
                l.fecha_vencimiento,
                l.activa,
                l.dispositivo_id,
                l.fecha_creacion,
                DATEDIFF(l.fecha_vencimiento, CURDATE()) as dias_restantes,
                u.id_usuario,
                u.nombre_completo,
                u.email,
                u.telefono,
                u.device_id
            FROM licencias l
            INNER JOIN usuarios u ON l.id_usuario = u.id_usuario
            ${whereClause}
            ORDER BY l.fecha_creacion DESC
        `

        const [licencias] = await db.query(query, queryParams)

        return {
            success: true,
            licencias: licencias.map(l => ({
                id: l.id_licencia,
                codigo: l.codigo_licencia,
                tipo: l.tipo_licencia,
                fechaInicio: l.fecha_inicio,
                fechaVencimiento: l.fecha_vencimiento,
                activa: l.activa === 1,
                dispositivoId: l.dispositivo_id,
                diasRestantes: l.dias_restantes,
                idUsuario: l.id_usuario,
                nombreUsuario: l.nombre_completo,
                emailUsuario: l.email,
                telefonoUsuario: l.telefono,
                deviceIdUsuario: l.device_id
            }))
        }

    } catch (error) {
        console.log('Error al obtener licencias:', error)
        return {
            success: false,
            mensaje: 'Error al obtener licencias',
            error: error.message
        }
    }
}

export async function obtenerUsuariosDisponibles() {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const query = `
            SELECT 
                id_usuario,
                nombre_completo,
                email,
                telefono,
                activo
            FROM usuarios
            WHERE activo = 1
            ORDER BY nombre_completo ASC
        `

        const [usuarios] = await db.query(query)

        return {
            success: true,
            usuarios: usuarios.map(u => ({
                id: u.id_usuario,
                nombre: u.nombre_completo,
                email: u.email,
                telefono: u.telefono
            }))
        }

    } catch (error) {
        console.log('Error al obtener usuarios:', error)
        return {
            success: false,
            mensaje: 'Error al obtener usuarios',
            error: error.message
        }
    }
}

export async function crearLicencia(idUsuario, tipoLicencia, deviceId = '') {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [usuario] = await db.query(
            'SELECT id_usuario, nombre_completo FROM usuarios WHERE id_usuario = ? AND activo = 1',
            [idUsuario]
        )

        if (usuario.length === 0) {
            return {
                success: false,
                mensaje: 'Usuario no encontrado o inactivo'
            }
        }

        const [configuracion] = await db.query(
            'SELECT clave, valor FROM configuracion_sistema WHERE clave IN (?, ?, ?)',
            ['duracion_licencia_mensual', 'duracion_licencia_trimestral', 'duracion_licencia_anual']
        )

        const duraciones = {
            mensual: 30,
            trimestral: 90,
            anual: 365
        }

        configuracion.forEach(config => {
            if (config.clave === 'duracion_licencia_mensual') {
                duraciones.mensual = parseInt(config.valor) || 30
            } else if (config.clave === 'duracion_licencia_trimestral') {
                duraciones.trimestral = parseInt(config.valor) || 90
            } else if (config.clave === 'duracion_licencia_anual') {
                duraciones.anual = parseInt(config.valor) || 365
            }
        })

        const duracion = duraciones[tipoLicencia] || 30

        const codigoLicencia = `LIC-${String(idUsuario).padStart(5, '0')}-${Date.now()}`

        // Actualizar el device_id del usuario si se proporciona
        if (deviceId && deviceId.trim() !== '') {
            await db.query(
                'UPDATE usuarios SET device_id = ? WHERE id_usuario = ?',
                [deviceId.trim(), idUsuario]
            )
        }

        const [resultado] = await db.query(`
            INSERT INTO licencias 
            (id_usuario, codigo_licencia, fecha_inicio, fecha_vencimiento, tipo_licencia, dispositivo_id, activa, modificado_por)
            VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, ?, 1, ?)
        `, [idUsuario, codigoLicencia, duracion, tipoLicencia, deviceId || null, admin.id])

        const idLicencia = resultado.insertId

        await db.query(`
            INSERT INTO historial_licencias (id_licencia, accion, id_admin_modificador, notas)
            VALUES (?, 'creada', ?, ?)
        `, [idLicencia, admin.id, `Licencia ${tipoLicencia} creada por el administrador`])

        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, id_registro_afectado, detalles)
            VALUES (?, 'INSERT', 'licencias', ?, ?)
        `, [admin.id, idLicencia, `Licencia ${tipoLicencia} creada para usuario ${usuario[0].nombre_completo}`])

        await db.query(`
            INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
            VALUES ('usuario', ?, 'Licencia activada', ?, 'exito')
        `, [idUsuario, `Tu licencia ${tipoLicencia} ha sido activada exitosamente. Codigo: ${codigoLicencia}`])

        return {
            success: true,
            mensaje: 'Licencia creada exitosamente',
            licencia: {
                id: idLicencia,
                codigo: codigoLicencia
            }
        }

    } catch (error) {
        console.log('Error al crear licencia:', error)
        return {
            success: false,
            mensaje: 'Error al crear licencia',
            error: error.message
        }
    }
}

export async function editarLicencia(idLicencia, idUsuario, tipoLicencia, deviceId = '') {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [licenciaExistente] = await db.query(
            'SELECT id_licencia, id_usuario, tipo_licencia FROM licencias WHERE id_licencia = ?',
            [idLicencia]
        )

        if (licenciaExistente.length === 0) {
            return {
                success: false,
                mensaje: 'Licencia no encontrada'
            }
        }

        const [configuracion] = await db.query(
            'SELECT clave, valor FROM configuracion_sistema WHERE clave IN (?, ?, ?)',
            ['duracion_licencia_mensual', 'duracion_licencia_trimestral', 'duracion_licencia_anual']
        )

        const duraciones = {
            mensual: 30,
            trimestral: 90,
            anual: 365
        }

        configuracion.forEach(config => {
            if (config.clave === 'duracion_licencia_mensual') {
                duraciones.mensual = parseInt(config.valor) || 30
            } else if (config.clave === 'duracion_licencia_trimestral') {
                duraciones.trimestral = parseInt(config.valor) || 90
            } else if (config.clave === 'duracion_licencia_anual') {
                duraciones.anual = parseInt(config.valor) || 365
            }
        })

        const duracion = duraciones[tipoLicencia] || 30

        // Actualizar el device_id en la tabla usuarios
        await db.query(
            'UPDATE usuarios SET device_id = ? WHERE id_usuario = ?',
            [deviceId && deviceId.trim() !== '' ? deviceId.trim() : null, idUsuario]
        )

        // Actualizar la licencia
        await db.query(`
            UPDATE licencias 
            SET tipo_licencia = ?,
                fecha_inicio = CURDATE(),
                fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL ? DAY),
                dispositivo_id = ?,
                modificado_por = ?
            WHERE id_licencia = ?
        `, [tipoLicencia, duracion, deviceId || null, admin.id, idLicencia])

        await db.query(`
            INSERT INTO historial_licencias (id_licencia, accion, id_admin_modificador, notas)
            VALUES (?, 'renovada', ?, ?)
        `, [idLicencia, admin.id, `Licencia actualizada a tipo ${tipoLicencia} y renovada - Device ID actualizado en usuario`])

        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, id_registro_afectado, detalles)
            VALUES (?, 'UPDATE', 'licencias', ?, ?)
        `, [admin.id, idLicencia, `Licencia editada - nuevo tipo: ${tipoLicencia}, Device ID usuario: ${deviceId || 'sin asignar'}`])

        await db.query(`
            INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
            VALUES ('usuario', ?, 'Licencia actualizada', ?, 'info')
        `, [licenciaExistente[0].id_usuario, `Tu licencia ha sido actualizada a tipo ${tipoLicencia} y renovada`])

        return {
            success: true,
            mensaje: 'Licencia actualizada exitosamente'
        }

    } catch (error) {
        console.log('Error al editar licencia:', error)
        return {
            success: false,
            mensaje: 'Error al editar licencia',
            error: error.message
        }
    }
}

export async function eliminarLicencia(idLicencia) {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [licencia] = await db.query(
            'SELECT id_usuario, codigo_licencia FROM licencias WHERE id_licencia = ?',
            [idLicencia]
        )

        if (licencia.length === 0) {
            return {
                success: false,
                mensaje: 'Licencia no encontrada'
            }
        }

        await db.query(`
            INSERT INTO historial_licencias (id_licencia, accion, id_admin_modificador, notas)
            VALUES (?, 'eliminada', ?, ?)
        `, [idLicencia, admin.id, 'Licencia eliminada por el administrador'])

        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, id_registro_afectado, detalles)
            VALUES (?, 'DELETE', 'licencias', ?, ?)
        `, [admin.id, idLicencia, `Licencia ${licencia[0].codigo_licencia} eliminada`])

        await db.query(
            'DELETE FROM licencias WHERE id_licencia = ?',
            [idLicencia]
        )

        await db.query(`
            INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
            VALUES ('usuario', ?, 'Licencia eliminada', ?, 'advertencia')
        `, [licencia[0].id_usuario, 'Tu licencia ha sido eliminada por el administrador'])

        return {
            success: true,
            mensaje: 'Licencia eliminada exitosamente'
        }

    } catch (error) {
        console.log('Error al eliminar licencia:', error)
        return {
            success: false,
            mensaje: 'Error al eliminar licencia',
            error: error.message
        }
    }
}

export async function cambiarEstadoLicencia(idLicencia, nuevoEstado) {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [licencia] = await db.query(
            'SELECT id_usuario FROM licencias WHERE id_licencia = ?',
            [idLicencia]
        )

        if (licencia.length === 0) {
            return {
                success: false,
                mensaje: 'Licencia no encontrada'
            }
        }

        await db.query(`
            UPDATE licencias 
            SET activa = ?, modificado_por = ?
            WHERE id_licencia = ?
        `, [nuevoEstado ? 1 : 0, admin.id, idLicencia])

        const accion = nuevoEstado ? 'activada' : 'desactivada'
        
        await db.query(`
            INSERT INTO historial_licencias (id_licencia, accion, id_admin_modificador, notas)
            VALUES (?, ?, ?, ?)
        `, [idLicencia, accion, admin.id, `Licencia ${accion} por el administrador`])

        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, id_registro_afectado, detalles)
            VALUES (?, 'UPDATE', 'licencias', ?, ?)
        `, [admin.id, idLicencia, `Licencia ${accion}`])

        const mensaje = nuevoEstado 
            ? 'Tu licencia ha sido activada por el administrador' 
            : 'Tu licencia ha sido desactivada por el administrador'
        
        await db.query(`
            INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
            VALUES ('usuario', ?, 'Estado de licencia', ?, ?)
        `, [licencia[0].id_usuario, mensaje, nuevoEstado ? 'exito' : 'advertencia'])

        return {
            success: true,
            mensaje: `Licencia ${accion} exitosamente`
        }

    } catch (error) {
        console.log('Error al cambiar estado de licencia:', error)
        return {
            success: false,
            mensaje: 'Error al cambiar estado de licencia',
            error: error.message
        }
    }
}

export async function obtenerDetallesLicencia(idLicencia) {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [licencia] = await db.query(`
            SELECT 
                l.*,
                DATEDIFF(l.fecha_vencimiento, CURDATE()) as dias_restantes,
                u.nombre_completo,
                u.email,
                u.telefono,
                u.device_id,
                u.fecha_registro as usuario_fecha_registro
            FROM licencias l
            INNER JOIN usuarios u ON l.id_usuario = u.id_usuario
            WHERE l.id_licencia = ?
        `, [idLicencia])

        if (licencia.length === 0) {
            return {
                success: false,
                mensaje: 'Licencia no encontrada'
            }
        }

        const [historial] = await db.query(`
            SELECT 
                h.accion,
                h.fecha_accion,
                h.notas,
                a.nombre_completo as admin_nombre
            FROM historial_licencias h
            LEFT JOIN administradores a ON h.id_admin_modificador = a.id_admin
            WHERE h.id_licencia = ?
            ORDER BY h.fecha_accion DESC
            LIMIT 20
        `, [idLicencia])

        const l = licencia[0]

        return {
            success: true,
            licencia: {
                id: l.id_licencia,
                codigo: l.codigo_licencia,
                tipo: l.tipo_licencia,
                fechaInicio: l.fecha_inicio,
                fechaVencimiento: l.fecha_vencimiento,
                activa: l.activa === 1,
                dispositivoId: l.dispositivo_id,
                diasRestantes: l.dias_restantes,
                fechaCreacion: l.fecha_creacion,
                usuario: {
                    id: l.id_usuario,
                    nombre: l.nombre_completo,
                    email: l.email,
                    telefono: l.telefono,
                    deviceId: l.device_id,
                    fechaRegistro: l.usuario_fecha_registro
                },
                historial: historial.map(h => ({
                    accion: h.accion,
                    fecha: h.fecha_accion,
                    notas: h.notas,
                    adminNombre: h.admin_nombre || 'Sistema'
                }))
            }
        }

    } catch (error) {
        console.log('Error al obtener detalles de licencia:', error)
        return {
            success: false,
            mensaje: 'Error al obtener detalles',
            error: error.message
        }
    }
}