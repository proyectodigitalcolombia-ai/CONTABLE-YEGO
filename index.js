const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. CONEXIÓN A LA BASE DE DATOS
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// 2. MODELO FINANZAS (TU TABLA LOCAL PARA PAGOS)
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  obs_fin: { type: DataTypes.TEXT }
}, { tableName: 'Yego_Finanzas' });

// 3. RUTA PRINCIPAL (CONSULTA DIRECTA A LOS NOMBRES QUE PASASTE)
app.get('/', async (req, res) => {
  try {
    // Usamos los nombres EXACTOS de tus <th>: "ID", "PLACA", "CLIENTE", "FECHA DESPACHO"
    const sql = `
      SELECT 
        "ID", 
        "PLACA", 
        "CLIENTE", 
        "SUBCLIENTE", 
        "CONTENEDOR", 
        "FECHA DESPACHO", 
        "DESPACHADOR" 
      FROM "Cargas" 
      ORDER BY "ID" DESC 
      LIMIT 100`;
    
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.ID);
      const valor = f ? Number(f.v_flete).toLocaleString() : "0";
      const estado = f ? f.est_pago : "PENDIENTE";
      const claseEstado = estado === 'PAGADO' ? 'pago' : 'pend';

      return `
        <tr class="fila">
          <td>#${c.ID}</td>
          <td><b>${c.PLACA || '---'}</b></td>
          <td>${c.CLIENTE || '---'}</td>
          <td>${c.SUBCLIENTE || '---'}</td>
          <td>${c.CONTENEDOR || '---'}</td>
          <td>${c["FECHA DESPACHO"] || '---'}</td>
          <td style="color:#10b981; font-weight:bold">$ ${valor}</td>
          <td><span class="badge ${claseEstado}">${estado}</span></td>
          <td>${c.DESPACHADOR || '---'}</td>
          <td><a href="/editar/${c.ID}" class="btn">LIQUIDAR</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <html>
      <head>
        <title>YEGO FINANZAS</title>
        <style>
          body{background:#0f172a; color:#f1f5f9; font-family:sans-serif; margin:0; padding:20px}
          .container{max-width:1400px; margin:auto}
          table{width:100%; border-collapse:collapse; background:#1e293b; border-radius:10px; overflow:hidden}
          th{background:#1e40af; padding:12px; text-align:left; font-size:11px}
          td{padding:10px; border-bottom:1px solid #334155; font-size:12px}
          .badge{padding:4px 8px; border-radius:10px; font-weight:bold; font-size:10px}
          .pend{background:#7f1d1d; color:#fecaca}
          .pago{background:#065f46; color:#a7f3d0}
          .btn{background:#2563eb; color:white; padding:5px 10px; text-decoration:none; border-radius:5px; font-size:10px}
          #busq{padding:10px; width:300px; border-radius:5px; border:1px solid #3b82f6; background:#1e293b; color:white; margin-bottom:10px}
        </style>
      </head>
      <body>
        <div class="container">
          <h2>💰 Control Contable YEGO</h2>
          <input type="text" id="busq" onkeyup="buscar()" placeholder="Buscar placa o cliente...">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>PLACA</th><th>CLIENTE</th><th>SUBCLIENTE</th><th>CONTENEDOR</th><th>F. DESPACHO</th><th>VALOR FLETE</th><th>ESTADO</th><th>DESPACHADOR</th><th>ACCION</th>
              </tr>
            </thead>
            <tbody id="tabla">${filas}</tbody>
          </table>
        </div>
        <script>
          function buscar() {
            let filter = document.getElementById('busq').value.toUpperCase();
            let rows = document.querySelectorAll('.fila');
            rows.forEach(row => {
              row.style.display = row.innerText.toUpperCase().includes(filter) ? '' : 'none';
            });
          }
        </script>
      </body>
      </html>`);
  } catch (err) {
    res.status(500).send("Error de conexión: " + err.message);
  }
});

// 4. RUTA EDITAR
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:50px">
      <div style="max-width:400px; margin:auto; background:#1e293b; padding:30px; border-radius:15px; border:1px solid #3b82f6">
        <h3>Liquidar Servicio #${req.params.id}</h3>
        <form action="/guardar/${req.params.id}" method="POST">
          <label>VALOR FLETE:</label><br>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:#10b981; border:1px solid #334155; font-size:20px; font-weight:bold"><br>
          <label>ESTADO DE PAGO:</label><br>
          <select name="est_pago" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:white; border:1px solid #334155">
            <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select><br>
          <label>OBSERVACIONES:</label><br>
          <textarea name="obs_fin" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:white; border:1px solid #334155">${f.obs_fin || ''}</textarea><br>
          <button type="submit" style="width:100%; padding:15px; background:#2563eb; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer">GUARDAR CAMBIOS</button>
        </form>
        <a href="/" style="display:block; text-align:center; margin-top:20px; color:#94a3b8; text-decoration:none">Volver al listado</a>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 Finanzas YEGO en línea')));
