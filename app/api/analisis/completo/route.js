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
  console.log('✅ OPTIONS /analisis/completo')
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
  try {
    console.log('═══════════════════════════')
    console.log('💾 GUARDAR ANÁLISIS COMPLETO')
    
    const decoded = verifyToken(request)
    if (!decoded) {
      console.log('❌ Token inválido')
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401, headers: corsHeaders }
      )
    }

    console.log('✅ Usuario autenticado:', decoded.id)

    const body = await request.json()
    console.log('📥 Body recibido con', body.num_capturas, 'capturas')

    const {
      id_grupo,
      ganancia_total,
      km_total,
      min_total,
      mxn_por_km,
      mxn_por_min,
      mxn_por_hora,
      num_capturas,
      mejor_tarifa_monto,
      mejor_tarifa_km,
      mejor_tarifa_min,
      mejor_tarifa_captura,
      mejor_km_monto,
      mejor_km_km,
      mejor_km_tarifa,
      mejor_km_captura,
      mejor_hora_monto,
      mejor_hora_min,
      mejor_hora_tarifa,
      mejor_hora_captura,
      ruta_corta_km,
      ruta_corta_monto,
      ruta_corta_min,
      ruta_corta_captura,
      ruta_larga_km,
      ruta_larga_monto,
      ruta_larga_min,
      ruta_larga_captura,
      viaje_rapido_min,
      viaje_rapido_monto,
      viaje_rapido_km,
      viaje_rapido_captura,
      viaje_lento_min,
      viaje_lento_monto,
      viaje_lento_km,
      viaje_lento_captura,
      mejor_ratio_monto,
      mejor_ratio_km,
      mejor_ratio_min,
      mejor_ratio_valor,
      mejor_ratio_captura
    } = body

    if (!id_grupo || !ganancia_total || !km_total || !min_total) {
      console.error('❌ Faltan campos requeridos')
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400, headers: corsHeaders }
      )
    }

    const connection = await db.getConnection()

    try {
      console.log('📝 Guardando viaje en historial...')
      const [resultViaje] = await connection.execute(
        `INSERT INTO viajes_registrados 
        (id_usuario, monto, km_total, min_total, mxn_por_km, mxn_por_min, mxn_por_hora, id_grupo, num_capturas) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [decoded.id, ganancia_total, km_total, min_total, mxn_por_km, mxn_por_min, mxn_por_hora, id_grupo, num_capturas]
      )

      const id_viaje = resultViaje.insertId
      console.log('✅ Viaje guardado con ID:', id_viaje)

      console.log('📊 Guardando análisis detallado...')
      await connection.execute(
        `INSERT INTO analisis_detallado (
          id_viaje, id_usuario, 
          ganancia_total, km_total, min_total, 
          mxn_por_km, mxn_por_min, mxn_por_hora,
          mejor_tarifa_monto, mejor_tarifa_km, mejor_tarifa_min, mejor_tarifa_captura,
          mejor_km_monto, mejor_km_km, mejor_km_tarifa, mejor_km_captura,
          mejor_hora_monto, mejor_hora_min, mejor_hora_tarifa, mejor_hora_captura,
          ruta_corta_km, ruta_corta_monto, ruta_corta_min, ruta_corta_captura,
          ruta_larga_km, ruta_larga_monto, ruta_larga_min, ruta_larga_captura,
          viaje_rapido_min, viaje_rapido_monto, viaje_rapido_km, viaje_rapido_captura,
          viaje_lento_min, viaje_lento_monto, viaje_lento_km, viaje_lento_captura,
          mejor_ratio_monto, mejor_ratio_km, mejor_ratio_min, mejor_ratio_valor, mejor_ratio_captura
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_viaje, decoded.id,
          ganancia_total, km_total, min_total,
          mxn_por_km, mxn_por_min, mxn_por_hora,
          mejor_tarifa_monto, mejor_tarifa_km, mejor_tarifa_min, mejor_tarifa_captura,
          mejor_km_monto, mejor_km_km, mejor_km_tarifa, mejor_km_captura,
          mejor_hora_monto, mejor_hora_min, mejor_hora_tarifa, mejor_hora_captura,
          ruta_corta_km, ruta_corta_monto, ruta_corta_min, ruta_corta_captura,
          ruta_larga_km, ruta_larga_monto, ruta_larga_min, ruta_larga_captura,
          viaje_rapido_min, viaje_rapido_monto, viaje_rapido_km, viaje_rapido_captura,
          viaje_lento_min, viaje_lento_monto, viaje_lento_km, viaje_lento_captura,
          mejor_ratio_monto, mejor_ratio_km, mejor_ratio_min, mejor_ratio_valor, mejor_ratio_captura
        ]
      )

      console.log('✅ Análisis detallado guardado')
      console.log('═══════════════════════════')

      return NextResponse.json(
        {
          success: true,
          message: 'Análisis completo guardado exitosamente',
          data: { id_viaje }
        },
        { headers: corsHeaders }
      )

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('❌ Error al guardar análisis completo:', error)
    console.log('═══════════════════════════')
    return NextResponse.json(
      { success: false, error: 'Error del servidor: ' + error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}