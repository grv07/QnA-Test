var Promise = require('es6-promise').Promise;
var gulp= require('gulp');
// var sass= require('gulp-sass');
var browserSync= require('browser-sync').create();
// var templateCache = require('gulp-angular-templatecache');
var useref = require('gulp-useref');
var uglify= require('gulp-uglify');
var gulpIf= require('gulp-if');
var cssnano= require('gulp-cssnano');
var imagemin= require('gulp-imagemin');
var cache= require('gulp-cache');
var del= require('del');
var runSequence= require('run-sequence');

// SASS TASK
/*
gulp.task('sass', function() {
  return gulp.src('app/scss/styles.scss')
    .pipe(sass())
    .pipe(gulp.dest('app/css'))
    .pipe(browserSync.reload({
      stream: true
    }))
});
*/

gulp.task('browserSync', function() {
  browserSync.init({
    server: {
      baseDir: ['./', './Test'],
      port: 8000,
      livereload: true
    },
  })
});

gulp.task('useref', function() {
  return gulp.src('Test/*.html')
  .pipe(useref())
  // .pipe(gulpIf('*.js', uglify()))
  .pipe(gulpIf('*.css', cssnano()))
  .pipe(gulp.dest('dist'))
});

gulp.task('images', function() {
  return gulp.src('Test/images/**/*.+(png|jpg|gif|svg)')
  .pipe(cache(imagemin({
    interlaced: true
  })))
  .pipe(gulp.dest('dist/images'))
});

gulp.task('fonts', function() {
  return gulp.src('Test/fonts/**/*')
  .pipe(gulp.dest('dist/fonts'))
});

gulp.task('views', function() {
  return gulp.src('Test/views/**/*')
  .pipe(gulp.dest('dist/views'))
});

gulp.task('katex-fonts', function() {
  return gulp.src('Test/css/fonts/**/*')
  .pipe(gulp.dest('dist/styles/fonts'))
});

// gulp.task('html', function () {
//   return gulp.src('Test/views/**/*.html')
//     .pipe(templateCache())
//     .pipe(gulp.dest('public'));
// });

gulp.task('clean:dist', function() {
  return del.sync('dist')
});

gulp.task('watch', ['browserSync'], function() {
  gulp.watch('Test/css/**/*.css', browserSync.reload);
  gulp.watch('Test/*.html', browserSync.reload);
  gulp.watch('Test/js/**/*.js', browserSync.reload);
  gulp.watch('Test/scripts/**/*.js', browserSync.reload);
});

gulp.task('default', function(callback) {
  runSequence(['browserSync', 'watch'], callback);
});

gulp.task('build', function(callback) {
  runSequence('clean:dist', ['useref', 'images', 'fonts', 'views', 'katex-fonts'], callback)
});
