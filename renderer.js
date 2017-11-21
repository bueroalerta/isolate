const electron = require('electron')
const fs = require('fs')

const path = require('./lib/path')
const modal = require('./lib/modal')
const db = require('./lib/db')
const util = require('./lib/util')

let pwd = ''
let global = electron.remote.getGlobal('global')
let root = global.root_dir
let global_db = global.db
let image_list = []

let ui = {
  'dirs': document.querySelector('#dirs'),
  'pwd': document.querySelector('#pwd'),
  'images': document.querySelector('#images'),
  'search': document.querySelector('#search'),
}

function isImage(f) {
  return ['jpeg', 'jpg', 'png'].some(ext => f.split('.').pop() == ext)
}

function setDirsNav(dirs) {
  let renderDir = function (d, path) {
    let l = document.createElement('li')
    let a = util.link('#', d)
    a.setAttribute('path', path)
    l.appendChild(a)
    return l
  }

  let dirs_container = document.querySelector('#dirs ul')
  dirs_container.innerHTML = ""
  if (pwd != '') {
    dirs_container.appendChild(renderDir('../', '../'))
  }
  dirs.forEach(d => {
    dirs_container.appendChild(renderDir(d, d))
  })

  document.querySelectorAll('#dirs a').forEach(a => {
    a.onclick = e => cd(a.getAttribute('path'))
  })
}

function setPwd(path) {
  ui.pwd.innerHTML = '/' + pwd
}

function imgUrl(relpath) {
  return 'file://' + path.join(root, relpath)
}

function setImages(images) {
  let renderImage = function(relpath) {
    let iw = document.createElement('div')
    iw.className = "iw"
    let i = document.createElement('img')
    i.onclick = e => {
      console.log(relpath)
      let metadata = db.itemForPath(global_db, relpath)
      console.log(metadata)
      modal.setModal(
        e.toElement.src,
        metadata.source,
        metadata.description,
        metadata.tags
      )
      modal.openModal()
    }
    i.src = imgUrl(relpath)
    iw.appendChild(i)
    return iw
  }

  image_list = images.map(x => imgUrl(x))
  ui.images.innerHTML = ""
  images.forEach(i => {
    ui.images.appendChild(renderImage(i))
  })
}

function hide(elem) {
  elem.style.display = 'none'
}

function show(elem) {
  elem.style.display = 'block'
}

function render() {
  let files = fs.readdirSync(path.join(root,pwd)).map(f => path.join(pwd, f))
  setPwd(pwd)
  setDirsNav(files.filter(f => path.isDir(path.join(root, f))))
  setImages(files.filter(f => isImage(f) && path.isFile(path.join(root, f))))
}

function search(term) {
  console.log("Search: " + term)
  let results = db.searchDB(global_db, term).filter(isImage)
  console.log(results)
  setImages(results.map(x => x.replace(root, '')))
  hide(ui.pwd)
  hide(ui.dirs)
  show(document.querySelector('#search-controls'))
}

function cd(relpath) {
  if (relpath == '../') {
    pwd = path.up(pwd)
  } else {
    pwd = path.removeLeadingSlash(relpath)
  }
  console.log('cd ' + pwd)
  render()
}

document.querySelector('#modal-controls #close').onclick = e => modal.closeModal()
document.querySelector('#modal-controls #zoom').onclick = e => modal.toggleModalZoom()
window.onclick = e => {
    if (e.target == modal.modal.content) {
        modal.closeModal()
    }
}
document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'Escape':
      modal.closeModal()
      break;
    case 'z':
      modal.toggleModalZoom()
      break;
    case 'ArrowRight':
      modal.advance(image_list, true)
      break;
    case 'ArrowLeft':
      modal.advance(image_list, false)
      break;
    default:
      return
  }
})

ui.search.addEventListener("keyup", e => {
  if (e.keyCode === 13) {
    e.preventDefault()
    search(ui.search.value)
  }
})

document.querySelector('#search-controls a').onclick = e => {
  hide(document.querySelector('#search-controls'))
  show(ui.pwd)
  show(ui.dirs)
  cd(pwd)
}

cd('')
