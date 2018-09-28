const gulp = require('gulp');
const $ = require("gulp-load-plugins")();
const autoprefixer = require('autoprefixer');
const browserSync = require('browser-sync');
const jschardet = require('jschardet');
const iconvLite = require('iconv-lite');
const fs = require('fs');
const path = require('path');

const DIR = {
  base: 'public',
  src: {
    sass: 'src/styles'
  },
  dist: {
    sass: 'public/assets/css'
  }
};


gulp.task('build', (done) => {
  gulp.src(`${DIR.src.sass}/**/**.scss`)
    .pipe($.plumber({
      errorHandler: $.notify.onError('Error: <%= error.message %>')
    }))
    .pipe($.sass({
      outputStyle: 'compressed'
    }))
    .pipe($.postcss([
      autoprefixer({
        browsers: [
          "last 2 versions",
          "ie >= 11",
          "Android >= 4.4"
        ],
        cascade: false
      })
    ]))
    .pipe(gulp.dest(DIR.dist.sass));

  done();
});


// 文字コードが shift_jis なら utf-8 に変換
function readFileAndConvert(filename)
{
  let filePath = path.join(__dirname, DIR.base, filename);
  if (/\/$/.test(filename)) {
    filePath = path.join(filePath, 'index.html');
  }
  if (! fs.existsSync(filePath)) {
    console.log(`file not exists: ${filePath}`);
    return null;
  }

  const data = fs.readFileSync(filePath);
  if (jschardet.detect(data).encoding === 'SHIFT_JIS') {
    return iconvLite.decode(Buffer.from(data, 'binary'), "Shift_JIS");
  }
  return data;
}


// SSI
function execSSI(source)
{
  source = source.toString();
  return source.replace(/<!--#include virtual="(.+)" -->/g, function(match, filename) {
    const data = readFileAndConvert(filename);
    return (data) ? data.toString() : `<div>file "${filename}" not found</div>`;
  });
}


// サーバ起動 (browser-sync, SSI, watch SCSS)
gulp.task('serve', (done) => {
  // browser-sync + SSI
  browserSync({
    files: `${DIR.base}/**/*`,
    server: {
      baseDir: DIR.base,
      middleware: [
        function (req, res, next) {
          if (/(\.html|\/)$/.test(req.url)) {
            // ファイル読み込み
            let source = readFileAndConvert(req.url);
            if (source) {
              source = execSSI(source);
              res.setHeader("Content-Type", "text/html; charset=UTF-8");
              res.end(source);
              return;
            }
          }
          next();
        }
      ]
    }
  });

  // watch SCSS
  gulp.watch(`${DIR.src.sass}/**/**.scss`, gulp.task('build'));

  done();
});

// default
gulp.task('default', gulp.series('build', 'serve', function(done) {
  done();
}));
