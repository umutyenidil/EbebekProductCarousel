class StorageManager {
    // storage config al
    constructor(config = {defaultCachingDuration: 0}) {
        // varolan local storage verileri ile cakismalari onlemek icin bir prefix olustur
        this._storageKeyPrefix = location.hostname;

        this._expiryInMillis = config.defaultCachingDuration;
    }

    // verilen key ile prefixi birlestirip storage key elde et
    _getStorageKey(key) {
        return this._storageKeyPrefix + "|" + key;
    }

    // veriyi local storage'a kaydet
    saveData(key, data, expiryInMillis = this._expiryInMillis) {
        try {
            // verilen caching suresi 0'dan buyukse olustur.
            const expiryTimestamp = expiryInMillis > 0 ? Date.now() + expiryInMillis : undefined;

            const cacheObject = {
                data,
                expiry: expiryTimestamp
            };

            // storage key ile veriyi JSON formatinda kaydet
            localStorage.setItem(this._getStorageKey(key), JSON.stringify(cacheObject));

        } catch (e) {
            console.error('data not saved');
        }
    }

    // veriyi local storage'dan getir.
    getSavedData(key) {
        try {
            const cacheString = localStorage.getItem(this._getStorageKey(key));

            // veri yoksa null dondur ve fonksiyonu bitir.
            if (!cacheString) return null;

            // kaydedilen veriyi ve expiry timestamp degerini ayir
            const {data, expiry} = JSON.parse(cacheString);

            // expiry timestamp yoksa veriyi dondur.
            if (!expiry) return data;

            // expiry time dolmus ise veriyi local storage'dan sil ve null dondur.
            if (Date.now() > expiry) {
                localStorage.removeItem(this._getStorageKey(key));
                return null;
            }

            return data;
        } catch (e) {
            return null;
        }
    }
}

class RequestManager {
    // caching ozellikleri icin storage manager'i dependency olarak iceri al
    constructor(storageManager) {
        this.storage = storageManager;
    }

    get({url, onData, onPending = null}) {
        // onPending callback verildiyse true degeri gonder
        onPending?.(true);

        // verilen url ile daha once veri cache edildiyse getir
        const data = this.storage.getSavedData(url);
        if (!data) {
            $.ajax({
                url,
                type: "GET",
                dataType: 'json',
                success: (data) => {
                    // veriyi sakla
                    this.storage.saveData(url, data);

                    // product placeholder card'larin duzgun bir sekilde goruntulenebilmesi icin biraz gecikme ekle
                    setTimeout(() => {
                        // onPending callback verildiyse false degeri gonder
                        onPending?.(false);

                        // veriyi onData callback'e gonder
                        onData(data);
                    }, 500);
                },
                error: () => {
                    // onPending callback verildiyse false degeri gonder
                    onPending?.(false);
                }
            });
        } else {
            // verilen url ile cache edilmis veriyi onData callback'e gonder
            onPending?.(false);
            onData(data);
        }
    }
}

class UIUtils {
    // tarayici locale degerini al
    constructor() {
        this._locale = navigator.language;
    }

    // locale'a gore verilen fiyati formatla
    formatPrice(price) {
        return new Intl.NumberFormat(this._locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    }
}

class ProductCarousel {
    // hangi block'tan sonra gelecekse o blogun selector'unu al
    constructor({prevBlockSelector, title, productsUrl}) {
        // storage manager'i init et 10 saniye caching suresi ile
        this.storage = new StorageManager({
            defaultCachingDuration: 10_000,
        });

        // request manager'i init et
        this.request = new RequestManager(this.storage);

        // component icin gerekli css'i ekle
        this.buildCss();

        this.uiUtils = new UIUtils();

        // urun cardlari ve placeholderlarinin eklenecegi container'i olustur
        this.buildProductCarouselContainer(prevBlockSelector, title);

        // urunleri yakala
        this.fetchProducts(productsUrl);

        this.initializeEventListeners();
    }

    fetchProducts(url) {
        this.request.get({
            url,
            onData: (products) => {
                // veri gelince urun card'larini olustur
                for (let i = 0; i < products.length; i++) {
                    const productListItem = this.buildProductListItem(products[i]);
                    $(document).find("ul.uYproduct-list").append(productListItem);
                }
            },
            onPending: (pending) => {
                // veri yuklenirken placholder'lari goster
                if (pending) {
                    $(document).find("ul.uYproduct-list").css("pointer-events", "none");
                    for (let i = 0; i < 8; i++) {
                        const productListItemPlaceholder = this.buildProductListItemPlaceholder();
                        $(document).find("ul.uYproduct-list").append(productListItemPlaceholder);
                    }
                } else {
                    $(document).find("ul.uYproduct-list").removeAttr("style");
                    $(document).find("ul.uYproduct-list").empty();
                }
            },
        });
    }

    buildCss() {
        const css = `
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Quicksand', sans-serif;
}

.uYcontainer {
    margin: 24px auto 0 24px;
    width: 100%;
}

.uYproduct-group {
    display: flex;
    flex-direction: column;
    border-radius: 0 0 36px 36px;
}

.uYproduct-group .uYproduct-group__header {
    padding: 0 24px;
}

.uYproduct-group .uYproduct-group__header .uYtitle {
    font-family: Quicksand-Bold;
    font-size: 2.2rem;
    font-weight: 700;
    line-height: 1.15;
    color: #f28e00;
    margin: 0;
}

.uYproduct-group .uYproduct-group__content {
    position: relative;
    margin: 24px 0;
}

.uYproduct-group .uYproduct-group__content .uYproduct-list {
    list-style: none;
    cursor: grab;

    width: 100%;
    padding: 3px;

    display: flex;
    flex-wrap: nowrap;

    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;

    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
}

.uYproduct-group .uYproduct-group__content .uYproduct-list::-webkit-scrollbar {
    display: none;
}

.uYproduct-group .uYproduct-group__content .uYproduct-list.uYdragging {
    cursor: grabbing;
    user-select: none;
}

.uYproduct-group .uYproduct-group__content .uYproduct-list .uYproduct-list__item {
    margin-right: 12px;

    flex: 0 0 47%;

    scroll-snap-align: start;
}

.uYproduct-group .uYproduct-group__content .uYproduct-list .uYproduct-list__item.uYplaceholder {
    pointer-events: none;
}

.uYproduct-group .uYproduct-group__content .uYproduct-list .uYproduct-list__item:last-child {
    margin-right: 0;
}

.uYproduct-group .uYproduct-group__content .uYproduct-list .uYproduct-list__item a {
    text-decoration: none;
}

.uYproduct-group .uYproduct-group__content .uYswiper-next,
.uYproduct-group .uYproduct-group__content .uYswiper-prev {
    display: none;
    cursor: pointer;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    position: absolute;
    bottom: 50%;
    top: auto;
    border: 1px solid #0000;
}

.uYproduct-group .uYproduct-group__content .uYswiper-next:hover,
.uYproduct-group .uYproduct-group__content .uYswiper-prev:hover {
    border: 1px solid #f28e00;
    background-color: #ffffff;
}

.uYproduct-group .uYproduct-group__content .uYswiper-prev {
    background: url(/assets/svg/prev.svg) no-repeat;
    background-color: #fef6eb;
    background-position: 18px;
    left: -65px;
}
.uYproduct-group .uYproduct-group__content .uYswiper-next {
    background: url(/assets/svg/next.svg) no-repeat;
    background-color: #fef6eb;
    background-position: 21px;
    right: -65px;
}

.uYproduct-card {
    font-family: 'Poppins', sans-serif;

    position: relative;
    z-index: 9;
    padding: 6px;
    margin-left: 2px;

    display: flex;
    flex-direction: column;

    border-radius: 12px;
    border: 1px solid #ededed;

    cursor: pointer;
}

.uYproduct-card.uYplaceholder {
    padding: 0;
    overflow: hidden;
}

.uYproduct-card:hover {
    outline: 3px solid #f28e00;
}

.uYproduct-card .uYproduct-card__header {
    width: 100%;
    aspect-ratio: 1/1;
    margin-bottom: 42px;
    padding: 0 16px
}

.uYproduct-card .uYproduct-card__header.uYplaceholder {
    background-color: #f2fafe;
}

.uYproduct-card .uYproduct-card__header img {
    width: 100%;
    aspect-ratio: 1/1;

    object-fit: contain;
    object-position: center;
}

.uYproduct-card .uYproduct-card__title {
    width: 100%;
    height: 44px;
    padding: 0 16px;
    margin-bottom: 12px;
    overflow: hidden;
}

.uYproduct-card .uYproduct-card__title .uYtitle {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;

    color: #7d7d7d;
    font-size: 12px;
    line-height: 1.2;
    font-weight: 500;
}

.uYproduct-card .uYproduct-card__title .uYtitle.uYplaceholder {
    height: 15px;
    width: 75%;
    border-radius: 8px;
    background-color: #f2fafe;
}

.uYproduct-card .uYproduct-card__rating {
    padding: 0 16px;

    display: flex;
    align-items: center;
    column-gap: 8px;
}

.uYproduct-card .uYproduct-card__rating .uYrating-bar {
    list-style: none;

    display: flex;
    column-gap: 3px;
}

.uYproduct-card .uYproduct-card__rating .uYrating-bar.uYplaceholder {
    width: 112px;
    height: 27px;
    border-radius: 14px;
    background-color: #f2fafe;
}

.uYproduct-card .uYproduct-card__rating .uYrating-bar li i{
    color: #d7d7d7;
    font-size: 11px;
}

.uYproduct-card .uYproduct-card__rating .uYrating-bar li i .uYfilled {
    color: #fed100;
}

.uYproduct-card .uYproduct-card__rating .uYrating-count {
    margin-bottom: 3px;

    display: block;

    font-size: 12px;
    color: #7d7d7d;
}

.uYproduct-card .uYproduct-card__pricing {
    padding: 0 16px;

    display: flex;
    row-gap: 4px;
    flex-direction: column;

    color: #7d7d7d;
}

.uYproduct-card .uYproduct-card__pricing .uYdiscounted {
    color: #00a365;
}

.uYproduct-card .uYproduct-card__pricing .uYdiscount {
    height: 28px;

    display: flex;
    align-items: center;
    column-gap: 8px;
}

.uYproduct-card .uYproduct-card__pricing .uYdiscount .uYprice-old {
    text-decoration: line-through;
    font-size: 14px;
    font-weight: 500;
}

.uYproduct-card .uYproduct-card__pricing .uYdiscount .uYpercentage {
    display: inline-flex;
    align-items: center;
    column-gap: 2px;

    font-size: 18px;
    font-weight: 700;
}

.uYproduct-card .uYproduct-card__pricing .uYdiscount .uYpercentage i {
    display: inline-block;
    height: 22px;
    font-size: 22px;
    margin-left: 3px;
    margin-bottom: 6px;
}

.uYproduct-card .uYproduct-card__pricing .uYprice-now {
    margin-top: 28px;

    font-size: 18px;
    font-weight: 600;
}

.uYproduct-card .uYproduct-card__pricing .uYprice-now.uYplaceholder {
    height: 37px;
    border-radius: 19px;
    background-color: #f2fafe;
    width: 128px;
}

.uYproduct-card .uYproduct-card__pricing .uYprice-now.uYdiscounted {
    margin-top: 0;
}

.uYproduct-card .uYproduct-card__promotion {
    height: 72px;
}

.uYproduct-card .uYproduct-card__footer {
    padding: 16px 16px 12px 16px;
}

.uYproduct-card .uYproduct-card__footer .uYbtn-cart {
    cursor: pointer;
    appearance: none;
    outline: none;

    width: 100%;
    padding: 16px 24px;
    background-color: #fef6eb;

    border: none;
    border-radius: 36px;

    font-size: 14px;
    font-weight: 700;
    color: #f28e00;
}

.uYproduct-card .uYproduct-card__footer .uYbtn-cart.uYplaceholder {
    height: 53px;
    background-color: #f2fafe;
}

.uYproduct-card .uYproduct-card__footer .uYbtn-cart:hover {
    background-color: #f28e00;

    color: #ffffff;
}

.uYproduct-card .uYproduct-card__overlay {
    pointer-events: none;
    position: absolute;
    width: 100%;
    height: 100%;
    padding: 16px;
}

.uYproduct-card .uYproduct-card__overlay .uYbtn-favorite {
    pointer-events: auto;
    position: absolute;
    top: 5px;
    right: 20px;

    cursor: pointer;
    appearance: none;
    border: none;

    width: 50px;
    height: 50px;

    background-color: #ffffff;

    display: flex;
    align-items: center;
    justify-content: center;

    box-shadow: 0 2px 4px 0 #00000024;

    border-radius: 50%;
}

.uYproduct-card .uYproduct-card__overlay .uYbtn-favorite .uYheart-icon,
.uYproduct-card .uYproduct-card__overlay .uYbtn-favorite:hover .uYheart-icon.uYhovered {
    display: block;
}

.uYproduct-card .uYproduct-card__overlay .uYbtn-favorite .uYheart-icon.uYhovered,
.uYproduct-card .uYproduct-card__overlay .uYbtn-favorite:hover .uYheart-icon {
    display: none;
}

@media (min-width: 480px) {
    .uYcontainer {
        margin: 50px auto;
    }
    
    .uYproduct-group {
        box-shadow: 15px 15px 30px 0 #ebebeb80;
    }
    
    .uYproduct-group .uYproduct-group__header {
        background-color: #fef6eb;
        padding: 24px 54px;
        border-radius: 36px 36px 0 0;
    }
    
    .uYproduct-group .uYproduct-group__header .uYtitle {
        font-family: Quicksand-Bold;
        font-size: 3rem;
        line-height: 1.11;
    }

    .uYproduct-group .uYproduct-group__content .uYproduct-list .uYproduct-list__item {
        margin-right: 24px;
        flex: 0 0 48%;
    }
    
    .uYproduct-card .uYproduct-card__pricing .uYprice-now {
        font-size: 24px;
    }

    .uYproduct-card .uYproduct-card__rating .uYrating-bar {
        list-style: none;

        display: flex;
        column-gap: 6px;
    }
    
    .uYproduct-card .uYproduct-card__rating .uYrating-bar li i{
        font-size: 14px;
    }
    
    .uYproduct-group .uYproduct-group__content .uYswiper-next,
    .uYproduct-group .uYproduct-group__content .uYswiper-prev {
        display: block;
    }
}

@media (min-width: 540px) {
    .uYcontainer {
        max-width: 540px;
    }
}

@media (min-width: 768px) {
    .uYcontainer {
        max-width: 720px;
    }
}

@media (min-width: 992px) {
    .uYcontainer {
        max-width: 960px;
    }

    .uYproduct-group .uYproduct-group__content .uYproduct-list .uYproduct-list__item {
        flex: 0 0 31.8%;
    }
}

@media (min-width: 1280px) {
    .uYcontainer {
        max-width: 1180px;
    }

    .uYproduct-group .uYproduct-group__content .uYproduct-list .uYproduct-list__item {
        flex: 0 0 23.5%;
    }
}

@media (min-width: 1480px) {
    .uYcontainer {
        max-width: 1296px;
    }

    .uYproduct-group .uYproduct-group__content .uYproduct-list .uYproduct-list__item {
        flex: 0 0 18.56%
    }
}
`;

        // gereksiz bosluklari kaldirarak css icerigini minify et
        const minCss = css
            .replace(/\s+/g, ' ')
            .replace(/\s*{\s*/g, '{')
            .replace(/\s*}\s*/g, '}')
            .replace(/\s*:\s*/g, ':')
            .replace(/\s*;\s*/g, ';')
            .replace(/;\}/g, '}');

        $("<style>").html(minCss).appendTo("head");
    }

    buildProductCarouselContainer(anchorSelector, title) {
        // kendisinden sonra eklenecek elementi bul
        const $anchor = $(anchorSelector);

        return $anchor.after(`
        <div class="uYcontainer">
            <div class="uYproduct-group">
                <div class="uYproduct-group__header">
                    <h2 class="uYtitle">${title}</h2>
                </div>
                <div class="uYproduct-group__content">
                    <ul class="uYproduct-list">
                    </ul>
                    <button class="uYswiper-prev"></button>
                    <button class="uYswiper-next"></button>
                </div>
            </div>
        </div> 
        `);
    }

    // urun card'i olustur
    buildProductListItem({id, brand, name, url, img, price, original_price, rating, rating_count}) {
        const priceNow = `
            <span class="uYprice-now${original_price > price ? " uYdiscounted" : ""}">${this.uiUtils.formatPrice(price)} TL</span>
        `;

        // indirim yuzdesini hesapla
        const discountPercentage = Math.floor(((original_price - price) / original_price) * 100);
        const discount = original_price > price ? `
            <div class="uYdiscount">
                <span class="uYprice-old uYdiscounted">${this.uiUtils.formatPrice(original_price)} TL</span>
                <span class="uYpercentage uYdiscounted"><span>%${discountPercentage}</span><i class="icon icon-decrease"></i></span>
            </div>
        ` : '';

        // urun puanini temsil edecek rating bar'i hazirla
        let ratingItems = "";
        for (let i = 0; i < 5; i++) {
            const filled = Math.ceil(rating ?? 0) >= i + 1;
            ratingItems += `<li><i class='star cx-icon fas fa-star ng-star-inserted${filled ? " uYfilled" : ""}'></i></li>`;
        }

        // urunun favorilere eklenip eklenmedigine gore default/filed favorite button olustur
        const buildFavoriteButton = (id) => {
            const isFavorite = this.isFavoriteProduct(id);

            return `
                <button class="uYbtn-favorite"
                        data-favorite="${isFavorite ? "1" : "0"}">
                    <img src="${isFavorite ? "assets/svg/added-favorite.svg" : "assets/svg/default-favorite.svg"}" alt="heart" class="uYheart-icon">
                    <img src="${isFavorite ? "assets/svg/added-favorite-hover.svg" : "assets/svg/default-hover-favorite.svg"}" alt="heart" class="uYheart-icon uYhovered">
                </button>
            `;
        };

        return `
            <li class="uYproduct-list__item"
                data-id="${id}">
                <a href="${url}" target="_blank">
                    <div class="uYproduct-card">
                        <div class="uYproduct-card__header">
                            <img src="${img}" alt="product-image">
                        </div>
                        <div class="uYproduct-card__title">
                            <h2 class="uYtitle"><b>${brand} -</b> ${name}</h2>
                        </div>
                        <div class="uYproduct-card__rating">
                            <ul class="uYrating-bar">
                                ${ratingItems}
                            </ul>
                            <span class="uYrating-count">(${rating_count ?? 0})</span>
                        </div>
                        <div class="uYproduct-card__pricing">
                            ${discount}
                            ${priceNow}
                        </div>
                        <div class="uYproduct-card__promotion">
                        </div>
                        <div class="uYproduct-card__footer">
                            <button class="uYbtn-cart">Sepete Ekle</button>
                        </div>
                        
                        <div class="uYproduct-card__overlay">
                            ${buildFavoriteButton(id)}
                        </div>
                    </div>
                </a>
            </li>
        `
    }

    // veriler yuklenirken kullanilacak placholder product card olustur
    buildProductListItemPlaceholder() {
        return `
            <li class="uYproduct-list__item uYplaceholder">
                <div class="uYproduct-card uYplaceholder">
                        <div class="uYproduct-card__header uYplaceholder">
                        </div>
                        <div class="uYproduct-card__title">
                            <div class="uYtitle uYplaceholder"></div>
                        </div>
                        <div class="uYproduct-card__rating">
                            <div class="uYrating-bar uYplaceholder""></div>
                        </div>
                        <div class="uYproduct-card__pricing">
                            <div class="uYprice-now uYplaceholder"></div>
                        </div>
                        <div class="uYproduct-card__promotion">
                        </div>
                        <div class="uYproduct-card__footer">
                            <div class="uYbtn-cart uYplaceholder"></div>
                        </div>
                    </div>
            </li>
        `;
    }

    // urun id'sini favori urunler listesine ekle
    saveFavoriteProduct(productId) {
        const favoriteProductIds = this.storage.getSavedData("favoriteProductIds") ?? [];

        if (favoriteProductIds.includes(productId)) return;

        favoriteProductIds.push(productId);

        this.storage.saveData("favoriteProductIds", favoriteProductIds, 0)
    }

    // urun id'sini favori urunler listesinde mi diye kontrol et
    isFavoriteProduct(productId) {
        const favoriteProductIds = this.storage.getSavedData("favoriteProductIds") ?? [];

        return favoriteProductIds.includes(productId);
    }

    // urun id'sini favori urunler listesinden kaldir
    removeFavoriteProduct(productId) {
        const favoriteProductIds = this.storage.getSavedData("favoriteProductIds");

        if (!favoriteProductIds) return;

        const newFavoriteProductIds = favoriteProductIds.filter((fpi) => fpi !== productId);

        this.storage.saveData("favoriteProductIds", newFavoriteProductIds, 0)
    }

    initializeEventListeners() {
        // carousel ozelligine sahip olacak elementi sec
        const $slider = $('.uYproduct-list');

        // scroll durumunu kontrol etmek icin degiskenleri olustur
        let isDown = false;
        let startX;
        let scrollLeft;

        // mouse tiklanildiginda scroll'a basla
        $slider.on('mousedown', function (e) {
            isDown = true;

            // cursor ozelligini degistir
            $slider.addClass('uYdragging');
            // mouseun element icindeki x konumunu hesapla
            startX = e.pageX - $slider.offset().left;
            // current scroll pozisyonunu al
            scrollLeft = $slider.scrollLeft();

            // metinlerin secilmesi gibi drag ozelliklerini engelle
            e.preventDefault();
        });

        // mouse birakildiginda cursor degerini degistir
        $(document).on('mouseup', function () {
            isDown = false;
            $slider.removeClass('uYdragging');
        });

        // mouse hareket ederken grab edildiyse scroll et
        $(document).on('mousemove', function (e) {
            // grab yoksa scroll iptal
            if (!isDown) return;
            const x = e.pageX - $slider.offset().left;
            // scroll mesafesini hesapla
            const walk = (x - startX) * 1.5;
            // scroll durumunu guncelle
            $slider.scrollLeft(scrollLeft - walk);
        });

        // carousel control butonlari ile urun card'larini saga/sola kaydirmayi sagla
        $('.uYproduct-group__content').on('click', function (e) {
            const productListItemWidth = $(this).find(".uYproduct-list").children(":first").width();

            // prev buton tiklandiysa sola kaydir
            if ($(e.target).hasClass("uYswiper-prev")) {
                $slider.animate({
                    scrollLeft: $slider.scrollLeft() - productListItemWidth,
                }, 100);
            }

            // next buton tiklandiysa saga kaydir
            if ($(e.target).hasClass("uYswiper-next")) {
                $slider.animate({
                    scrollLeft: $slider.scrollLeft() + productListItemWidth
                }, 100);
            }
        });

        $(".uYproduct-list").on("click", (e) => {
            // sepete ekleme butonuna tiklanirsa urun sayfasina yonlendirmeyi engelle
            if ($(e.target).hasClass("uYbtn-cart")) {
                e.preventDefault();
            }

            // favori butonuna tiklanirsa urun sayfasina yonlendirmeyi engelle
            if ($(e.target).closest("button").hasClass("uYbtn-favorite")) {
                e.preventDefault();

                // urun id getir
                const productId = $(e.target).closest(".uYproduct-list__item").data("id");

                // urun favori durumunu getir
                const isFavorite = !!+$(e.target).closest("button").data("favorite");

                // urunu onceki duruma gore favorilerden ekle/cikar
                if (isFavorite) {
                    this.removeFavoriteProduct(productId);
                } else {
                    this.saveFavoriteProduct(productId);
                }

                // favorite button gorunumunu toggle et
                this.updateFavoriteButton(productId, !isFavorite);
            }
        });
    }

    // urun durumuna gore favorite button default/filled durumunu guncelle
    updateFavoriteButton(productId, isFavorite) {
        const $button = $(".uYproduct-list").find(`.uYproduct-list__item[data-id="${productId}"]`).find("button.uYbtn-favorite");
        $button.data("favorite", isFavorite ? "1" : "0");
        $button.find(".uYheart-icon").attr("src", isFavorite ? "assets/svg/added-favorite.svg" : "assets/svg/default-favorite.svg");
        $button.find(".uYheart-icon.uYhovered").attr("src", isFavorite ? "assets/svg/added-favorite-hover.svg" : "assets/svg/default-hover-favorite.svg");
    }
}

class App {
    init() {
        const validPage = this.checkPage();

        if (!validPage) return;

        this.buildDependencies(() => {
            new ProductCarousel({
                prevBlockSelector: ".Section1",
                title: "Beğenebileceğinizi düşündüklerimiz",
                productsUrl: "https://gist.githubusercontent.com/sevindi/8bcbde9f02c1d4abe112809c974e1f49/raw/9bf93b58df623a9b16f1db721cd0a7a539296cf0/products.json"
            });
        });
    }

    checkPage() {
        const isCorrectLocation = window.location.pathname === '/' || window.location.pathname === '';

        if (!isCorrectLocation) console.log("wrong page");

        return isCorrectLocation;
    }

    // product carousel icin kullanilacak jquery surumunu dom'a ekle ve min.js loaded olduysa callback function'i cagir
    buildDependencies(cb) {
        const script = document.createElement('script');
        script.src = 'https://code.jquery.com/jquery-3.7.1.min.js';
        script.onload = cb;
        document.body.appendChild(script);
    }
}

const app = new App();
app.init();