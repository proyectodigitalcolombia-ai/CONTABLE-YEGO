const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de base de datos
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// Modelo de Finanzas con mapeo explícito
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true, field: 'cargaId' },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  saldo_a_pagar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas', timestamps: false });

app.get('/', async (req, res) => {
  try {
    // CONSULTA DE FUERZA BRUTA: 
    // Convertimos todo a TEXT para que el JOIN no falle por tipos de datos (Integer vs String)
    const sql = `
      SELECT 
        c.id AS id_real,
        c.placa,
        c.f_doc,
        c.createdAt,
        c.oficina,
        c.orig,
        c.dest,
        c.cli,
        f.v_flete,
        f.v_facturar,
        f.saldo_a_pagar,
        f.est_pago
      FROM "Cargas" c
      LEFT JOIN "Yego_Finanzas" f ON TRIM(CAST(c.id AS TEXT)) = TRIM(CAST(f."cargaId" AS TEXT))
      WHERE c.placa IS NOT NULL AND c.placa != ''
      ORDER BY c.id DESC 
      LIMIT 100`;
    
    const datos = await db.query(sql, { type: QueryTypes.SELECT });

    if (!datos || datos.length === 0) {
      return res.send("<h1>No se encontraron datos en la tabla Cargas</h1>");
    }

    let totalPendiente = 0;
    let filas = datos.map(c => {
      // Prioridad de fecha: f_doc -> createdAt -> Hoy
      const fechaCarga = c.f_doc || (c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '---');
      const fleteP = parseFloat(c.v_flete || 0);
      const fleteF = parseFloat(c.v_facturar || 0);
      const saldo = parseFloat(c.saldo_a_pagar || 0);

      if ((c.est_pago || 'PENDIENTE') === 'PENDIENTE') totalPendiente += fleteP;

      const tdStyle = `padding: 12px 8px; text-align: center; border-bottom: 1px solid #334155;`;

      return `
        <tr style="font-size: 11px; transition: background 0.3s;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='transparent'">
          <td style="${tdStyle} color: #94a3b8;">#${c.id_real}</td>
          <td style="${tdStyle} font-weight: bold;">${fechaCarga}</td>
          <td style="${tdStyle}">${c.oficina || '---'}</td>
          <td style="${tdStyle}">${c.orig || '---'} - ${c.dest || '---'}</td>
          <td style="${tdStyle}">${c.cli || '---'}</td>
          <td style="${tdStyle} background: rgba(59, 130, 246, 0.1); font-weight: bold; color: #60a5fa;">${c.placa}</td>
          <td style="${tdStyle} color: #10b981;">$${fleteP.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color: #3b82f6;">$${fleteF.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} font-weight: bold; color: #fbbf24;">$${saldo.toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">
            <a href="/editar/${c.id_real}" style="background:#3b82f6; color:white; padding:5px 10px; border-radius:4px; text-decoration:none; font-size:10px;">GESTIONAR</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: 'Inter', sans-serif; padding:20px; margin:0;">
        <div style="max-width: 1200px; margin: auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
            <div>
              <h2 style="margin:0; color: #3b82f6;">YEGO CONTABILIDAD v3.0</h2>
              <small style="color: #64748b;">Mostrando últimos 100 registros con enlace forzado</small>
            </div>
            <div style="text-align: right;">
              <span style="color:#ef4444; font-size: 12px; font-weight: bold;">SALDO TOTAL PENDIENTE</span><br>
              <span style="font-size: 28px; font-weight: 800; color: #f1f5f9;">$ ${totalPendiente.toLocaleString('es-CO')}</span>
            </div>
          </div>
          <div style="background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden;">
            <table style="width:100%; border-collapse:collapse;">
              <thead style="background:#3b82f6; color:white;">
                <tr>
                  <th style="padding:15px;">ID</th><th style="padding:15px;">FECHA</th>
                  <th style="padding:15px;">OFICINA</th><th style="padding:15px;">RUTA</th>
                  <th style="padding:15px;">CLIENTE</th><th style="padding:15px;">PLACA</th>
                  <th style="padding:15px;">FLETE P.</th><th style="padding:15px;">FLETE F.</th>
                  <th style="padding:15px;">SALDO</th><th style="padding:15px;">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>${filas}</tbody>
            </table>
          </div>
        </div>
      </body>
    `);
  } catch (err) {
    res.status(500).send(`<div style="padding:50px; background:#0f172a; color:white;"><h2>Error de Sistema</h2><p>${err.message}</p></div>`);
  }
});

// Rutas de guardado (permanecen iguales pero aseguran el tipo de dato)
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:white; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
      <form action="/guardar/${req.params.id}" method="POST" style="background:#1e293b; padding:30px; border-radius:15px; width:100%; max-width:400px; border:1px solid #3b82f6;">
        <h2 style="text-align:center; color:#3b82f6;">Liquidar Carga #${req.params.id}</h2>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; color:#94a3b8;">Flete a Pagar</label>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:10px; border-radius:5px; border:1px solid #334155; background:#0f172a; color:white;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:5px; color:#94a3b8;">Saldo Final</label>
          <input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" step="0.01" style="width:100%; padding:10px; border-radius:5px; border:1px solid #10b981; background:#0f172a; color:white;">
        </div>
        <button type="submit" style="width:100%; padding:12px; background:#3b82f6; border:none; border-radius:5px; color:white; font-weight:bold; cursor:pointer;">GUARDAR DATOS</button>
        <a href="/" style="display:block; text-align:center; margin-top:15px; color:#64748b; text-decoration:none;">Cancelar</a>
      </form>
    </body>
  `);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.upsert({ cargaId: req.params.id, ...req.body });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 MODO FUERZA BRUTA ACTIVO')));
