const mysql = require('mysql2/promise');

exports.connect = connect;

async function connect(options) {
	const pool = mysql.createPool(Object.assign({
		connectionLimit: 10
	}, options));

	const db = async function query(strings, ...values) {
		const conn = await pool.getConnection();
		const [rows, fields] = await conn.execute(strings.join('?'), values);
		await conn.release();
		return { rows, fields };
	};

	db.query = db;

	db.table = name => {
		return {
			insert: async data => {
				if (!Array.isArray(data)) data = [data];

				const keys = new Set();
				data.forEach(row => {
					Object.keys(row).forEach(key => {
						keys.add(key);
					});
				});

				const field_names = [...keys]; 
				const row_str = `(${Array(field_names.length).fill('?').join(',')})`;

				const values = [];
				data.forEach(row => {
					field_names.forEach(field => {
						values.push(field in row ? row[field] : null);
					});
				});

				const conn = await pool.getConnection();
				const [rows, fields] = await conn.execute(`
					INSERT INTO ${name} (${field_names.join(',')}) VALUES ${
						Array(data.length).fill(row_str).join(',')
					};
				`, values);
				await conn.release();
				return { rows, fields };
			}
		};
	};

	db.close = () => pool.end();

	return db;
}