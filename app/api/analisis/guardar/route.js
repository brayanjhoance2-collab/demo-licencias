// app/api/analisis/guardar/route.js
import { NextResponse } from 'next/server'
import db from '@/_DB/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secret_key_aqui'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS(request) {
  return NextResponse.json({}, { headers: corsHeaders })
}

function verifyToken(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export async function POST(request) {
  const connection = await db.getConnection()
  
  try {
    const decoded = verifyToken(request)
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: 'Token inválido'
      }, { status: 401, headers: corsHeaders })
    }

    const { 
      id_grupo, 
      ganancia_total, 
      km_total, 
      min_total, 
      mxn_por_km, 
      mxn_por_min, 
      mxn_por_hora,
      num_capturas,
      nombre_grupo // AGREGAR EL NOMBRE DEL GRUPO
    } = await request.json()

    await connection.beginTransaction()

    try {
      // 1. PRIMERO: Verificar si el grupo existe, si no, crearlo
      const [grupoExiste] = await connection.execute(
        `SELECT id_grupo FROM grupos_capturas WHERE id_grupo = ? AND id_usuario = ?`,
        [id_grupo, decoded.id]
      )

      if (grupoExiste.length === 0) {
        // El grupo NO existe, lo creamos
        await connection.execute(
          `INSERT INTO grupos_capturas (id_grupo, id_usuario, nombre_grupo, fecha_creacion) 
           VALUES (?, ?, ?, NOW())`,
          [id_grupo, decoded.id, nombre_grupo || `Grupo ${id_grupo}`]
        )
      }

      // 2. SEGUNDO: Ahora sí guardar el análisis (el grupo ya existe)
      await connection.execute(
        `INSERT INTO analisis_grupos 
         (id_grupo, id_usuario, ganancia_total, km_total, min_total, 
          mxn_por_km, mxn_por_min, mxn_por_hora, num_capturas) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id_grupo, decoded.id, ganancia_total, km_total, min_total, 
         mxn_por_km, mxn_por_min, mxn_por_hora, num_capturas]
      )

      // 3. TERCERO: Guardar en historial de viajes
      await connection.execute(
        `INSERT INTO viajes_registrados 
         (id_usuario, monto, km_total, min_total, mxn_por_km, mxn_por_min, mxn_por_hora) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [decoded.id, ganancia_total, km_total, min_total, mxn_por_km, mxn_por_min, mxn_por_hora]
      )

      await connection.commit()

      return NextResponse.json({
        success: true,
        message: 'Análisis guardado exitosamente'
      }, { headers: corsHeaders })

    } catch (error) {
      await connection.rollback()
      throw error
    }

  } catch (error) {
    console.error('Error al guardar análisis:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error del servidor'
    }, { status: 500, headers: corsHeaders })
  } finally {
    connection.release()
  }
}