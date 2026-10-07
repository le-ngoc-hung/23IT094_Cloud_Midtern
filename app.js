// --- NHANH DATABASE ĐA HOAN THANH ---
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session); 
const { engine } = require('express-handlebars');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

const readerConnection = mongoose.createConnection(process.env.MONGO_URI_READER);
const writerConnection = mongoose.createConnection(process.env.MONGO_URI_WRITER);

readerConnection.on('connected', () => console.log('Reader DB Connected'));
writerConnection.on('connected', () => console.log('Writer DB Connected'));

app.use(session({
    secret: 'my_super_secret_key',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
        url: process.env.MONGO_URI_WRITER, 
        collection: 'sessions'
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

const bookSchema = new mongoose.Schema({
    maSanPham: { type: String, required: true },
    tenSach: { type: String, required: true },
    giaGoc: { type: Number, required: true },
    giaSauThue: { type: Number }
});

const BookReader = readerConnection.model('Book', bookSchema);
const BookWriter = writerConnection.model('Book', bookSchema);

app.post('/api/books', async (req, res) => {
    try {
        const { maSanPham, tenSach, giaGoc } = req.body;

        // Cài đặt bộ lọc: Kiểm tra tiền tố 3 số cuối MSSV là 094
        if (!maSanPham.startsWith('094')) {
            return res.status(400).send('<script>alert("Lỗi: Mã sản phẩm bắt buộc phải có tiền tố 094!"); window.location.href="/books";</script>');
        }

        // Tự động tính giá sau thuế (VAT = 4 + 4 = 8%)
        const vatRate = 0.08;
        const giaSauThue = parseFloat(giaGoc) * (1 + vatRate);

        // Lưu dữ liệu bằng tài khoản Writer
        const newBook = new BookWriter({
            maSanPham,
            tenSach,
            giaGoc,
            giaSauThue
        });
        await newBook.save();
        
        // Thêm xong thì tự động quay về trang chủ để xem danh sách mới
        res.redirect('/books');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get('/books', async (req, res) => {
    try {
        const books = await BookReader.find().lean(); 
        res.render('books', { 
            books,
            hoTen: "Lê Ngọc Hùng",
            mssv: "23IT094",
            vat: "8%"
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
// --- NHANH SESSION ĐA HOAN THANH ---