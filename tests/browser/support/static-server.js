const fs=require('fs');
const http=require('http');
const path=require('path');

const root=path.resolve(__dirname,'../../..');
const swSource=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const currentVersion=(/var SW_VERSION='([^']+)'/.exec(swSource)||[])[1];
const port=Number(process.env.PORT)||4173;
const mimeTypes={
  '.css':'text/css; charset=utf-8',
  '.html':'text/html; charset=utf-8',
  '.ico':'image/x-icon',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png',
  '.svg':'image/svg+xml'
};

const server=http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
  const requestedPath=pathname==='/'?'index.html':pathname.replace(/^\/+/,'');
  const relativePath=requestedPath==='index.html'&&currentVersion?'shell/'+currentVersion+'/index.html':requestedPath;
  const target=path.resolve(root,relativePath);
  const relativeToRoot=path.relative(root,target);

  if(relativeToRoot.startsWith('..')||path.isAbsolute(relativeToRoot)){
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.stat(target,(statError,stat)=>{
    if(statError||!stat.isFile()){
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    response.writeHead(200,{
      'Cache-Control':'no-store',
      'Content-Type':mimeTypes[path.extname(target).toLowerCase()]||'application/octet-stream'
    });
    fs.createReadStream(target).pipe(response);
  });
});

server.listen(port,'127.0.0.1',()=>{
  process.stdout.write('QA_STATIC_SERVER_READY='+port+'\n');
});

function shutdown(){
  server.close(()=>process.exit(0));
}

process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
