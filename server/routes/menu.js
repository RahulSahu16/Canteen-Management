import express from 'express'
import multer from 'multer'
import { listMenu, listMasterMenu, getTodaysMenuConfig, updateTodaysMenu, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/menuController.js'

const upload = multer({ dest: 'uploads/' })
const router = express.Router()
router.get('/', listMenu)
router.get('/master', listMasterMenu)
router.get('/today/config', getTodaysMenuConfig)
router.patch('/today', updateTodaysMenu)
router.post('/master', upload.single('imageFile'), createMenuItem)
router.patch('/master/:id', upload.single('imageFile'), updateMenuItem)
router.delete('/master/:id', deleteMenuItem)
export default router
