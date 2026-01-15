const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.xml': 'text/xml',
    '.xsd': 'text/xml'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Handle XML Save Request
    if (req.method === 'POST' && req.url === '/save-xml') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const filePath = path.join(__dirname, 'editor.xml');
            console.log('Saving XML to:', filePath);
            fs.writeFile(filePath, body, 'utf8', (err) => {
                if (err) {
                    console.error('Error saving file:', err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Server Error: Could not save file.');
                } else {
                    console.log('File saved successfully.');
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('File saved successfully to ' + filePath);
                }
            });
        });
        return;
    }

    // Serve Static Files
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code == 'ENOENT'){
                res.writeHead(404);
                res.end('404 File Not Found');
            } else {
                res.writeHead(500);
                res.end('500 Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });

});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`To use the app, open your browser to http://localhost:${PORT}/`);
    console.log(`Press Ctrl+C to stop the server.`);
});
