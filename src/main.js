const sqlite3 = require("sqlite3").verbose()
const db = new sqlite3.Database(
	"/home/jcuenod/Programming/pdfindex/create-pdf-index/index.sqlite"
)

// LIMIT -1 OFFSET 0 is because of subquery flattening
// cf. https://www.mail-archive.com/sqlite-users@mailinglists.sqlite.org/msg115821.html
const stmt = db.prepare(`
SELECT 
  name,
  group_concat(page, ', ') as pages,
  group_concat(extract, '___SEPARATOR___') as extracts
FROM (
  SELECT
    metadata.rowid as rowid,
    name,
    page,
    snippet(pages, 2, '<b>', '</b>', '', 15) as extract
  FROM
    pages,
    metadata
  WHERE
    content MATCH ?
  AND
    pages.id = metadata.rowid
  LIMIT -1 OFFSET 0) fts
GROUP BY rowid
ORDER BY name
LIMIT 100;
`)
const queryToParam = query =>
	`${query
		.split(" ")
		.map(term => `"${term}"`)
		.join(" ")}`
const find = query =>
	new Promise((resolve, reject) => {
		const p = queryToParam(query)
		console.log(p)
		stmt.all(p, (err, rows) => {
			if (err) {
				reject(err)
			}
			resolve(rows)
		})
	})

const express = require("express")
const app = express()

app.get("/query", async (req, res) => {
	const query = req.query.q
	console.log(query)
	const results = await find(query)
	res.send(results)
})



const { exec } = require('child_process')
const filenameStmt = db.prepare(`
SELECT
  *
FROM
  metadata
WHERE
  name = ?
`)
const findPath = filename =>
	new Promise((resolve, reject) => {
		filenameStmt.all(filename, (err, rows) => {
			if (err) {
				reject(err)
			}
			resolve(rows)
		})
	})
app.get("/open", async (req, res) => {
	const { page, filename } = req.query
	console.log(page, filename)
	const results = await findPath(filename)
	console.log(results)
	const path = decodeURIComponent(results[0].path)
	console.log(path)
	res.send("ok")
	console.log(`okular -p ${+page + 1} ${path}`)
	exec(`okular -p ${+page + 1} "${path.replace(/\"/g, '\\"')}"`)
	console.log(`done`)
})


app.listen(3000)
