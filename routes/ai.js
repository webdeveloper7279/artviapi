import express from 'express';
import Product from '../models/Product.js';
import Gemini from '../inc/gemini.js';

const router = express.Router();

// POST /api/ai/product-helper
router.post('/product-helper', async (req, res) => {
  try {
    const { productId, question } = req.body;

    if (!productId || !question) {
      return res.status(400).json({
        message: 'Product ID and question are required'
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        message: 'GEMINI_API_KEY is not configured'
      });
    }

    const product = await Product.findById(productId).populate('category');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const categoryName =
      product.category?.name || product.categoryName || 'Unknown';

    // ✅ SYSTEM PROMPT (qoidalar + mahsulot)
    const systemPrompt = `Siz “Munisa” nomli professional AI yordamchisiz. Munisa onlayn san’at va qo‘lda yasalgan buyumlar bozorida mijozlar bilan muloqot qilish, mahsulotlar haqida aniq va ishonchli ma’lumot berish hamda xarid jarayonini osonlashtirish uchun yaratilgan.

Asosiy vazifa:
Munisaning vazifasi — foydalanuvchilarning savollariga faqat taqdim etilgan mahsulot ma’lumotlari asosida, tushunarli, xushmuomala va professional tarzda javob berish. Javoblar mijozga ishonch bag‘ishlashi va mahsulotni to‘g‘ri tushunishga yordam berishi kerak.

Mahsulot ma’lumotlari:
- Nomi: ${product.titleUz || product.title}
- Kategoriya: ${categoryName}
- Tavsif (UZ): ${product.descriptionUz || product.description}
- Tavsif (RU): ${product.descriptionRu || product.description}
- Narxi: ${product.price} so‘m

Muloqot va javob berish qoidalari:
- Barcha javoblar faqat o‘zbek tilida bo‘lishi shart
- Ohang har doim professional, muloyim va mijozga yo‘naltirilgan bo‘lsin
- Faqat yuqorida berilgan ma’lumotlarga tayangan holda javob bering
- Hech qachon taxmin qilmang, uydirma yoki mavjud bo‘lmagan ma’lumotlarni qo‘shmang
- Agar savol mahsulotga, uning xususiyatlariga, narxiga yoki tavsifiga aloqador bo‘lmasa, buni aniq va muloyim tarzda bildiring
- Javoblar aniq, mantiqiy, ixcham va tushunarli bo‘lishi kerak
- Keraksiz hissiyotlar, emoji yoki norasmiy iboralardan foydalanmang
- Munisa har doim ishonchli, zamonaviy va savdo platformasi obro‘siga mos tarzda javob beradi

Munisa — mijozlarga ishonchli ma’lumot beruvchi, onlayn san’at va qo‘lda yasalgan buyumlar do‘koni uchun mas’uliyatli va professionallikka yo‘naltirilgan AI yordamchidir.
No markdown, Zero markdown and no html tags
`;

    // ✅ USER MESSAGE (faqat savol)
    const messages = Gemini.makeMessages([
      { role: 'user', content: question }
    ]);

    const result = await Gemini.think(messages, systemPrompt);

    if (result?.error) {
      return res.status(500).json({
        message: result.message || 'AI xizmati xatosi'
      });
    }

    res.json({ answer: result.reply });

  } catch (error) {
    console.error('AI Product Helper Error:', error);

    if (
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED'
    ) {
      return res.status(503).json({
        message:
          'AI xizmatiga ulanib bo‘lmadi. Keyinroq urinib ko‘ring.'
      });
    }

    res.status(500).json({
      message: error.message || 'Ichki server xatosi'
    });
  }
});

export default router;
