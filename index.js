const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. CONEXIÓN CON CONFIGURACIÓN DE NOMBRES ESTRICTOS
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  // Evitamos que Sequelize intente pluralizar o cambiar nombres
  define: { 
    freezeTableName: true,
    quoteIdentifiers: true 
  }
});

// 2. MODELO CARGA (MAPEO LITERAL)
// Usamos "field" con el nombre EXACTO que ves en tu DB (mayúsculas)
const Carga = db.define('Carga', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    field: 'ID' // <-- Si esto falla, intentaremos '"ID"' en el siguiente paso
  },
  placa: { type: DataTypes.STRING, field: 'PLACA' },
  cliente: { type: DataTypes.STRING, field: 'CLI' },
  fecha: { type: DataTypes.STRING, field: 'F_D' }
}, { 
  tableName: 'Cargas', 
  timestamps: false 
});

// 3. MODELO FINANZAS (TU TABLA)
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

// 4. RUTA PRINCIPAL
app.get('/', async (req, res) => {
  try {
    // Intentamos una consulta cruda si findAll sigue fallando
    const datos = await Carga.findAll({ include: [Finanza] });
    
    let filas = datos.map(c => `
      <tr style="border-bottom:1px solid #334155">
        <td style="padding:10px">#${c.id}</td>
        <td>${c.placa || '---'}</td>
        <td>${c.cliente || '---'}</td>
        <td style="color:#10b981;font-weight:bold">$ ${Number(c.Finanza?.v_flete || 0).toLocaleString()}</td>
        <td>${c.Finanza?.est_pago || 'PENDIENTE'}</td>
        <td><a href="/editar/${c.id}" style="color:#3b82f6">GESTIONAR</a></td>
      </tr>`).join('');

    res.send(`
      <body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px">
        <h2>💰 YEGO - Panel Contable</h2>
        <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:8px">
          <thead style="background:#1e40af">
            <tr><th>ID</th><th>PLACA</th><th>CLIENTE</th><th>FLETE</th><th>ESTADO</th><th>ACCION</th></tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>
    `);
  } catch (err) {
    // Si falla, mostramos la consulta SQL que intentó hacer
    res.status(500).send("ERROR DE SQL: " + err.message);
  }
});

// 5. RUTAS DE GESTIÓN
app.get('/editar/:id', async (req, res) => {
  const f = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:40px">
      <h3>Gestionar Servicio #${req.params.id}</h3>
      <form action="/guardar/${req.params.id}" method="POST">
        Flete: <input type="number" name="v_flete" value="${f[0].v_flete}" style="display:block;margin:10px 0;padding:8px">
        Estado: <select name="est_pago" style="display:block;margin:10px 0;padding:8px">
          <option ${f[0].est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option ${f[0].est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select>
        <button type="submit" style="padding:10px 20px;background:#2563eb;color:white;border:none;border-radius:5px">GUARDAR</button>
      </form>
    </body>
  `);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('Sincronizado')));
