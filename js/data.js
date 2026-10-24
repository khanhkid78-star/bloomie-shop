/* Dữ liệu sản phẩm và banner */

const TAGS = {
    hong: 'Hoa hồng',
    huongduong: 'Hoa hướng dương',
    ly: 'Hoa ly',
    tulip: 'Hoa tulip',
    khaitruong: 'Hoa khai trương',
    sinhnhat: 'Hoa sinh nhật',
    tinhyeu: 'Hoa tình yêu',
    chiabuon: 'Hoa chia buồn',
    mua: 'Hoa theo mùa'
};

const CATBG = {
    hong: '#fbe4e4',
    huongduong: '#f4efd6',
    ly: '#eef3e4',
    tulip: '#fbe6ea',
    khaitruong: '#f3ece4',
    sinhnhat: '#eef2e6',
    tinhyeu: '#fbe2ea',
    chiabuon: '#f3ece6',
    mua: '#ece8f6'
};

const P = [
    {
        id: 1,
        name: 'Bó hoa hồng đỏ lãng mạn',
        price: 450000,
        old: 600000,
        rate: 4.9,
        tags: ['hong', 'tinhyeu', 'sinhnhat'],
        alt: 'Bó hồng đỏ gói giấy đen',
        sp: {
            paper: 'black',
            ribbon: '#b3182b',
            bg: ['#efe4dc', '#dccabc'],
            fl: [
                { t: 'rose', p: 'red', n: 13, r: 17 }
            ]
        }
    },
    {
        id: 2,
        name: 'Bó hoa hồng pastel ngọt ngào',
        price: 380000,
        old: 500000,
        rate: 4.8,
        tags: ['hong', 'tinhyeu', 'sinhnhat'],
        alt: 'Bó hồng pastel gói giấy hồng',
        sp: {
            paper: 'pink',
            ribbon: '#e07b95',
            bg: ['#f6e6e6', '#ead3d3'],
            fl: [
                { t: 'rose', p: 'pink', n: 8, r: 17 },
                { t: 'rose', p: 'cream', n: 3, r: 15 },
                { t: 'rose', p: 'hot', n: 2, r: 13 },
                { t: 'baby', n: 5, r: 13 }
            ]
        }
    },
    {
        id: 3,
        name: 'Bó hoa hướng dương rực rỡ',
        price: 320000,
        old: 420000,
        rate: 4.9,
        tags: ['huongduong', 'khaitruong', 'mua'],
        alt: 'Bó hướng dương gói giấy kraft',
        sp: {
            paper: 'kraft',
            ribbon: '#8a5a3a',
            bg: ['#f1e2c8', '#e3cca6'],
            fl: [
                { t: 'sun', n: 7, r: 23 },
                { t: 'baby', n: 3, r: 12 }
            ]
        }
    },
    {
        id: 4,
        name: 'Bó hoa ly thanh khiết',
        price: 420000,
        old: 550000,
        rate: 4.8,
        tags: ['ly', 'sinhnhat', 'chiabuon'],
        alt: 'Bó hoa ly trắng',
        sp: {
            paper: 'cream',
            ribbon: '#7aa1b8',
            bg: ['#ece6dc', '#dcd2c4'],
            fl: [
                { t: 'lily', n: 5, r: 29 },
                { t: 'daisy', n: 3, r: 9 },
                { t: 'baby', n: 4, r: 12 }
            ]
        }
    },
    {
        id: 5,
        name: 'Bó tulip hồng xuân',
        price: 350000,
        old: 460000,
        rate: 4.7,
        tags: ['tulip', 'mua', 'tinhyeu'],
        alt: 'Bó tulip hồng',
        sp: {
            paper: 'blush',
            ribbon: '#d97a92',
            bg: ['#f7e8e6', '#ecd5d3'],
            fl: [
                { t: 'tulip', p: 'hot', n: 5, r: 22 },
                { t: 'tulip', p: 'pink', n: 4, r: 22 },
                { t: 'baby', n: 3, r: 12 }
            ]
        }
    },
    {
        id: 6,
        name: 'Bó hoa khai trương rực rỡ',
        price: 890000,
        old: 1100000,
        rate: 4.8,
        tags: ['khaitruong'],
        alt: 'Bó hoa khai trương nhiều màu',
        sp: {
            paper: 'sage',
            ribbon: '#e0a62f',
            bg: ['#f1e8d6', '#e2d3b6'],
            fl: [
                { t: 'sun', n: 3, r: 21 },
                { t: 'rose', p: 'hot', n: 4, r: 17 },
                { t: 'lily', n: 2, r: 25 },
                { t: 'daisy', n: 5, r: 10 },
                { t: 'baby', n: 3, r: 12 }
            ]
        }
    },
    {
        id: 7,
        name: 'Bó oải hương Provence',
        price: 290000,
        old: 380000,
        rate: 4.9,
        tags: ['mua'],
        alt: 'Bó oải hương tím',
        sp: {
            paper: 'cream',
            ribbon: '#7b5db0',
            bg: ['#ebe6f2', '#d9d2e6'],
            leaf: 60,
            fl: [
                { t: 'lav', n: 12, r: 1 },
                { t: 'baby', n: 4, r: 12 }
            ]
        }
    },
    {
        id: 8,
        name: 'Bó cúc họa mi mùa thu',
        price: 250000,
        old: 320000,
        rate: 4.6,
        tags: ['sinhnhat', 'mua'],
        alt: 'Bó cúc họa mi trắng',
        sp: {
            paper: 'sage',
            ribbon: '#d9b84a',
            bg: ['#eef0e2', '#dde3cb'],
            fl: [
                { t: 'daisy', n: 15, r: 13 },
                { t: 'baby', n: 4, r: 12 }
            ]
        }
    },
    {
        id: 9,
        name: 'Bó hoa trắng chia sẻ nỗi buồn',
        price: 480000,
        old: 600000,
        rate: 4.8,
        tags: ['chiabuon', 'ly'],
        alt: 'Bó hoa trắng nhẹ nhàng',
        sp: {
            paper: 'cream',
            ribbon: '#8d9aa5',
            bg: ['#eceae6', '#dcd9d3'],
            fl: [
                { t: 'lily', n: 4, r: 27 },
                { t: 'daisy', n: 8, r: 11 },
                { t: 'baby', n: 5, r: 12 }
            ]
        }
    },
    {
        id: 10,
        name: 'Bó hoa sinh nhật rạng rỡ',
        price: 520000,
        old: 680000,
        rate: 4.9,
        tags: ['sinhnhat', 'huongduong'],
        alt: 'Bó hoa sinh nhật nhiều màu',
        sp: {
            paper: 'pink',
            ribbon: '#e2a233',
            bg: ['#f7ebdc', '#ecd8c0'],
            fl: [
                { t: 'rose', p: 'hot', n: 3, r: 17 },
                { t: 'sun', n: 3, r: 19 },
                { t: 'daisy', n: 7, r: 10 },
                { t: 'baby', n: 3, r: 12 }
            ]
        }
    },
    {
        id: 11,
        name: 'Bó hồng kem Juliet',
        price: 480000,
        old: 640000,
        rate: 4.7,
        tags: ['hong', 'tinhyeu'],
        alt: 'Bó hồng kem',
        sp: {
            paper: 'cream',
            ribbon: '#c9a27a',
            bg: ['#f4ebe2', '#e6d6c8'],
            fl: [
                { t: 'rose', p: 'cream', n: 10, r: 17 },
                { t: 'rose', p: 'pink', n: 3, r: 15 },
                { t: 'baby', n: 3, r: 11 }
            ]
        }
    },
    {
        id: 12,
        name: 'Bó hướng dương mini ấm áp',
        price: 220000,
        old: 290000,
        rate: 4.8,
        tags: ['huongduong', 'mua'],
        alt: 'Bó hướng dương nhỏ',
        sp: {
            paper: 'kraft',
            ribbon: '#7a8f4d',
            bg: ['#f3e6cf', '#e6d2b0'],
            fl: [
                { t: 'sun', n: 5, r: 21 },
                { t: 'baby', n: 3, r: 12 }
            ]
        }
    }
];

const SLIDES = [
    {
        k: 'Hoa tươi mỗi ngày',
        a: 'Trao hoa',
        b: 'trao yêu thương',
        d: 'Những đóa hoa tươi thắm, thay lời muốn nói cho những người bạn yêu thương.',
        tag: 'tinhyeu',
        sp: {
            paper: 'pink',
            ribbon: '#e48ba0',
            leaf: 80,
            fl: [
                { t: 'rose', p: 'pink', n: 5, r: 21 },
                { t: 'rose', p: 'hot', n: 1, r: 19 },
                { t: 'rose', p: 'cream', n: 2, r: 17 },
                { t: 'daisy', n: 13, r: 10 },
                { t: 'baby', n: 4, r: 13 }
            ]
        }
    },
    {
        k: 'Hoa hướng dương',
        a: 'Nắng rực rỡ',
        b: 'cho ngày mới',
        d: 'Sắc vàng ấm áp cho ngày khai trương, sinh nhật và mọi khởi đầu mới.',
        tag: 'huongduong',
        sp: {
            paper: 'kraft',
            ribbon: '#8a5a3a',
            leaf: 80,
            fl: [
                { t: 'sun', n: 7, r: 24 },
                { t: 'daisy', n: 6, r: 9 },
                { t: 'baby', n: 4, r: 13 }
            ]
        }
    },
    {
        k: 'Hoa ly thơm ngát',
        a: 'Tinh khôi',
        b: 'như một lời chúc',
        d: 'Hương thơm nhẹ nhàng, dành cho người bạn trân trọng nhất.',
        tag: 'ly',
        sp: {
            paper: 'cream',
            ribbon: '#7aa1b8',
            leaf: 80,
            fl: [
                { t: 'lily', n: 6, r: 30 },
                { t: 'daisy', n: 5, r: 9 },
                { t: 'baby', n: 5, r: 13 }
            ]
        }
    },
    {
        k: 'Hoa theo mùa',
        a: 'Sắc xuân',
        b: 'ngọt ngào',
        d: 'Tulip và oải hương theo mùa, cắm gói thủ công ngay trong ngày.',
        tag: 'tulip',
        sp: {
            paper: 'blush',
            ribbon: '#d97a92',
            leaf: 80,
            fl: [
                { t: 'tulip', p: 'hot', n: 5, r: 23 },
                { t: 'tulip', p: 'pink', n: 4, r: 23 },
                { t: 'tulip', p: 'cream', n: 2, r: 21 },
                { t: 'baby', n: 3, r: 13 }
            ]
        }
    }
];

P.forEach(p => {
    p.sp.alt = p.alt;
});

/* Mô tả ngắn cho từng sản phẩm */
const DESC={
 1:'Những đóa hồng đỏ nhung được chọn từng bông, gói giấy đen sang trọng và thắt nơ đỏ. Món quà hợp cho kỷ niệm, tỏ tình hoặc sinh nhật người thương.',
 2:'Hồng pastel hồng phấn và kem điểm thêm baby trắng, gói giấy hồng dịu dàng. Hợp tặng bạn gái, mẹ và đồng nghiệp nữ.',
 3:'Hướng dương vàng rực kết hợp baby trắng, gói giấy kraft mộc mạc. Mang năng lượng tích cực cho ngày khai trương và những khởi đầu mới.',
 4:'Ly trắng tinh khôi, thơm nhẹ, kèm cúc họa mi và baby. Phù hợp sinh nhật, thăm hỏi hoặc trang trí phòng khách.',
 5:'Tulip hồng nhiều sắc độ, cắm gọn và gói giấy blush. Loại hoa của mùa xuân, đẹp nhất trong 5 - 7 ngày đầu.',
 6:'Bó hoa nhiều màu gồm hướng dương, hồng, ly và cúc, tạo cảm giác phát lộc. Thích hợp tặng cửa hàng mới khai trương.',
 7:'Oải hương tím thơm dịu, có thể để khô làm trang trí sau khi hoa tàn. Hợp tặng người thích sự yên bình.',
 8:'Cúc họa mi trắng nhỏ xinh, gói giấy xanh sage. Giản dị, trong trẻo và dễ chọn cho mọi dịp.',
 9:'Bó hoa trắng nhẹ nhàng để gửi lời chia sẻ và tưởng nhớ. Màu sắc trang nhã, không cầu kỳ.',
 10:'Hồng, hướng dương và cúc phối nhiều màu tươi tắn, gói giấy hồng. Bó hoa sinh nhật rạng rỡ cho người bạn yêu quý.',
 11:'Hồng kem Juliet mềm mại màu be, gói giấy kem. Phong cách nhẹ nhàng, hợp tặng cô giáo, mẹ hoặc người lớn tuổi.',
 12:'Bó hướng dương nhỏ gọn, giá dễ chịu. Hợp để bàn làm việc hoặc tặng nhanh trong ngày.'
};
const CARE=['Cắt chéo 2 - 3 cm cuống hoa và cắm vào bình nước sạch ngay khi nhận.','Thay nước mỗi ngày, tránh ánh nắng trực tiếp và gió điều hòa thổi thẳng.','Bỏ lá ngập trong nước để nước không bị đục và hoa bền hơn.'];

/* Kích thước bó hoa: m là hệ số nhân giá so với cỡ Vừa */
const SIZES = {
    S: {
        n: 'Nhỏ',
        m: .8,
        note: 'khoảng 7 bông'
    },
    M: {
        n: 'Vừa',
        m: 1,
        note: 'khoảng 11 bông'},
    L: {
        n: 'Lớn',
        m: 1.4,
        note: 'khoảng 17 bông'
    }
};

/* Mã giảm giá */
const COUPONS ={
    BLOOM10: 'Giảm 10% tổng đơn',
    FREESHIP: 'Miễn phí giao hàng'
};
const SLOTS =[
    '8:00 - 10:00',
    '10:00 - 12:00',
    '12:00 - 15:00',
    '15:00 - 18:00',
    '18:00 - 21:00'
];
