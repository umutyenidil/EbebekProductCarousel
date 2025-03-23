class StorageManager {
    constructor(defaultCachingDuration = 0) {
        this._storageKeyPrefix = location.hostname;

        this._expiryInMillis = defaultCachingDuration;
    }

    _getStorageKey(key) {
        return this._storageKeyPrefix + "|" + key;
    }

    saveData(key, data, expiryInMillis = this._expiryInMillis) {
        try {
            const expiryTimestamp = expiryInMillis > 0 ? Date.now() + expiryInMillis : undefined;

            const cacheObject = {
                data,
                expiry: expiryTimestamp
            };

            localStorage.setItem(this._getStorageKey(key), JSON.stringify(cacheObject));

            return data;
        } catch (e) {
            return data;
        }
    }

    getSavedData(key) {
        try {
            const cacheString = localStorage.getItem(this._getStorageKey(key));

            if (!cacheString) return null;

            const {data, expiry} = JSON.parse(cacheString);

            if (!expiry) return data;

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
    constructor(cachingDuration = 1000) {
        this.storageKeyPrefix = location.hostname;

        this.expiryInMillis = cachingDuration;
    }

    getStorageKey(url) {
        return this.storageKeyPrefix + "|" + url;
    }

    cacheRequestData(url, data, expiryInMillis = this.expiryInMillis) {
        try {
            const expiryTimestamp = Date.now() + expiryInMillis;

            const cacheObject = {
                data,
                expiry: expiryTimestamp
            };

            localStorage.setItem(this.getStorageKey(url), JSON.stringify(cacheObject));

            return data;
        } catch (e) {
            return data;
        }
    }

    cachedRequestData(url) {
        try {
            const cacheString = localStorage.getItem(this.getStorageKey(url));

            if (!cacheString) return null;

            const {data, expiry} = JSON.parse(cacheString);

            if (Date.now() > expiry) {
                localStorage.removeItem(url);
                return null;
            }

            return data;
        } catch (e) {
            return null;
        }
    }

    fetcher({url, onData, onPending = null}) {
        onPending?.(true);

        const data = this.cachedRequestData(url);
        if (!data) {
            $.ajax({
                url,
                type: "GET",
                dataType: 'json',
                success: (data) => {
                    this.cacheRequestData(url, data);

                    // add some timeout to see placeholders explicitly
                    setTimeout(() => {
                        onPending?.(false);

                        onData(data);
                    }, 500);
                },
                error: () => {
                    onPending?.(false);
                }
            });
        } else {
            onPending?.(false);
            onData(data);
        }
    }
}

class UIUtils {
    constructor() {
        this.locale = navigator.language;
    }

    formatPrice(price) {
        return new Intl.NumberFormat(this.locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    }
}

class ProductCarousel {
    constructor(prevBlockSelector) {
        this.buildDependencies(() => {
            this.buildCss();

            this.productCarouselContainer = this.buildProductCarouselContainer(prevBlockSelector, "Beğenebileceğinizi düşündüklerimiz");
        });
    }

    buildCss() {
        const css = `
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Quicksand', sans-serif;
}

.container {
    margin: 0 auto
}

.product-group {
    display: flex;
    flex-direction: column;
    box-shadow: 15px 15px 30px 0 #ebebeb80;
    border-radius: 0 0 36px 36px;
}

.product-group .product-group__header {
    background-color: #fef6eb;
    padding: 24px 54px;
    border-radius: 36px 36px 0 0;
}

.product-group .product-group__header .title {
    font-weight: 700;
    font-size: 1.75rem;
    line-height: 1.1;
    color: #f28e00;
}

.product-group .product-group__content {
    position: relative;
    margin: 24px 0;
}

.product-group .product-group__content .product-list {
    list-style: none;
    cursor: grab;

    width: 100%;
    padding: 3px;

    display: flex;
    flex-wrap: nowrap;

    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;

    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
}

.product-group .product-group__content .product-list::-webkit-scrollbar {
    display: none;
}

.product-group .product-group__content .product-list.dragging {
    cursor: grabbing;
    user-select: none;
}

.product-group .product-group__content .product-list .product-list__item {
    margin-right: 24px;

    flex: 0 0 47%;

    scroll-snap-align: start;
}

.product-group .product-group__content .product-list .product-list__item.placeholder {
    pointer-events: none;
}

.product-group .product-group__content .product-list .product-list__item:last-child {
    margin-right: 0;
}

.product-group .product-group__content .product-list .product-list__item a {
    text-decoration: none;
}

.product-group .product-group__content .swiper-next,
.product-group .product-group__content .swiper-prev {
    cursor: pointer;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    position: absolute;
    bottom: 50%;
    top: auto;
    border: 1px solid #0000;
}

.product-group .product-group__content .swiper-next:hover,
.product-group .product-group__content .swiper-prev:hover {
    border: 1px solid #f28e00;
    background-color: #ffffff;
}

.product-group .product-group__content .swiper-prev {
    background: url(/assets/svg/prev.svg) no-repeat;
    background-color: #fef6eb;
    background-position: 18px;
    left: -65px;
}
.product-group .product-group__content .swiper-next {
    background: url(/assets/svg/next.svg) no-repeat;
    background-color: #fef6eb;
    background-position: 21px;
    right: -65px;
}

.product-card {
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

.product-card.placeholder {
    padding: 0;
    overflow: hidden;
}

.product-card:hover {
    outline: 3px solid #f28e00;
}

.product-card .product-card__header {
    width: 100%;
    aspect-ratio: 1/1;
    margin-bottom: 42px;
    padding: 0 16px
}

.product-card .product-card__header.placeholder {
    background-color: #ededed;
}

.product-card .product-card__header img {
    width: 100%;
    aspect-ratio: 1/1;

    object-fit: contain;
    object-position: center;
}

.product-card .product-card__title {
    width: 100%;
    height: 44px;
    padding: 0 16px;
    margin-bottom: 12px;
    overflow: hidden;
}

.product-card .product-card__title .title {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;

    color: #7d7d7d;
    font-size: 12px;
    line-height: 1.2;
    font-weight: 500;
}

.product-card .product-card__title .title.placeholder {
    height: 15px;
    width: 75%;
    border-radius: 8px;
    background-color: #ededed;
}

.product-card .product-card__rating {
    padding: 0 16px;

    display: flex;
    align-items: center;
    column-gap: 8px;
}

.product-card .product-card__rating .rating-bar {
    list-style: none;

    display: flex;
    column-gap: 3px;
}

.product-card .product-card__rating .rating-bar.placeholder {
    width: 112px;
    height: 27px;
    border-radius: 14px;
    background-color: #ededed;
}

.product-card .product-card__rating .rating-bar li {
    color: #d7d7d7;
    font-size: 1rem;
}

.product-card .product-card__rating .rating-bar li .filled {
    color: #fed100;
}

.product-card .product-card__rating .rating-count {
    margin-bottom: 3px;

    display: block;

    font-size: 12px;
    color: #7d7d7d;
}

.product-card .product-card__pricing {
    padding: 0 16px;

    display: flex;
    row-gap: 4px;
    flex-direction: column;

    color: #7d7d7d;
}

.product-card .product-card__pricing .discounted {
    color: #00a365;
}

.product-card .product-card__pricing .discount {
    height: 28px;

    display: flex;
    align-items: center;
    column-gap: 8px;
}

.product-card .product-card__pricing .discount .price-old {
    text-decoration: line-through;
    font-size: 14px;
    font-weight: 500;
}

.product-card .product-card__pricing .discount .percentage {
    display: inline-flex;
    align-items: center;
    column-gap: 2px;

    font-size: 18px;
    font-weight: 700;
}

.product-card .product-card__pricing .discount i {
    font-size: 1.4rem;
}

.product-card .product-card__pricing .price-now {
    margin-top: 28px;

    font-size: 24px;
    font-weight: 600;
}

.product-card .product-card__pricing .price-now.placeholder {
    height: 37px;
    border-radius: 19px;
    background-color: #ededed;
    width: 128px;
}

.product-card .product-card__pricing .price-now.discounted {
    margin-top: 0;
}

.product-card .product-card__promotion {
    height: 72px;
}

.product-card .product-card__footer {
    padding: 16px 16px 12px 16px;
}

.product-card .product-card__footer .btn-cart {
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

.product-card .product-card__footer .btn-cart.placeholder {
    height: 53px;
    background-color: #ededed;
}

.product-card .product-card__footer .btn-cart:hover {
    background-color: #f28e00;

    color: #ffffff;
}

.product-card .product-card__overlay {
    position: absolute;
    width: 100%;
    height: 100%;
    padding: 16px;
}

.product-card .product-card__overlay .btn-favorite {
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

.product-card .product-card__overlay .btn-favorite .heart-icon,
.product-card .product-card__overlay .btn-favorite:hover .heart-icon.hovered {
    display: block;
}

.product-card .product-card__overlay .btn-favorite .heart-icon.hovered,
.product-card .product-card__overlay .btn-favorite:hover .heart-icon {
    display: none;
}

@media (min-width: 576px) {
    .container {
        max-width: 540px;
    }

    .product-group .product-group__content .product-list .product-list__item {
        flex: 0 0 48%;
    }

    .product-card .product-card__rating .rating-bar {
        list-style: none;

        display: flex;
        column-gap: 6px;
    }

    .product-card .product-card__rating .rating-bar li {
        color: #d7d7d7;
        font-size: 1.1rem;
    }
}

@media (min-width: 768px) {
    .container {
        max-width: 720px;
    }
}

@media (min-width: 992px) {
    .container {
        max-width: 960px;
    }

    .product-group .product-group__content .product-list .product-list__item {
        flex: 0 0 31.8%;
    }
}

@media (min-width: 1280px) {
    .container {
        max-width: 1180px;
    }

    .product-group .product-group__content .product-list .product-list__item {
        flex: 0 0 23.5%;
    }
}

@media (min-width: 1480px) {
    .container {
        max-width: 1296px;
    }

    .product-group .product-group__content .product-list .product-list__item {
        flex: 0 0 18.56%
    }
}
        `;

        const minCss = css.replace(/\s+/g, ' ')
            .replace(/\s*{\s*/g, '{')
            .replace(/\s*}\s*/g, '}')
            .replace(/\s*:\s*/g, ':')
            .replace(/\s*;\s*/g, ';')
            .replace(/;\}/g, '}');

        $("<style>").html(minCss).appendTo("head");
    }

    buildDependencies(cb) {
        const script = document.createElement('script');
        script.src = 'https://code.jquery.com/jquery-3.7.1.min.js';
        script.onload = cb;
        document.body.appendChild(script);
    }

    buildProductCarouselContainer(anchorSelector, title) {
        const $anchor = $(anchorSelector);

        return $anchor.after(`
        <div class="container">
            <div class="product-group">
                <div class="product-group__header">
                    <h2 class="title">${title}</h2>
                </div>
                <div class="product-group__content">
                    <ul class="product-list">
                    </ul>
                    <button class="swiper-prev"></button>
                    <button class="swiper-next"></button>
                </div>
            </div>
        </div> 
        `);
    }
}

class App {
    constructor() {
        this.productCarousel = new ProductCarousel(".Section1");
    }
}

const app = new App();
window.app = app;