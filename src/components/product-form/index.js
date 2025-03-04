import SortableList from '../sortable-list/index.js';
import escapeHtml from '../../utils/escape-html.js';
import fetchJson from '../../utils/fetch-json.js';
import NotificationMessage from '../notification/index.js';

const IMGUR_CLIENT_ID = '28aaa2e823b03b1';
const BACKEND_URL = 'https://course-js.javascript.ru';

export default class ProductForm {
  element;
  formElements = {};
  subElements = {};

  constructor(productId = '') {
    this.productId = productId;
  }

  async render() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.getFormHTML;
    this.element = wrapper.firstElementChild;
    this.subElements = this.getSubElements();
    this.formElements = this.subElements.productForm.elements;

    this.initEventListeners();

    const [loadedCategoriesData, loadedProductData] = await this.loadData();

    this.setCategoriesDataOnForm(loadedCategoriesData);
    if (this.productId) {
      this.setProductDataOnForm(loadedProductData[0]);
    } else {
      const sortableImageList = new SortableList();
      this.subElements.imageListContainer.append(sortableImageList.element);
    }

    return this.element;
  }

  get getFormHTML() {
    return `<div class="product-form">
      <form data-element="productForm" class="form-grid">
        ${this.getTitle}
        ${this.getDescription}
        ${this.getUploadImages}
        ${this.getCategory}
        ${this.getPriceAndDiscount}
        ${this.getQuantity}
        ${this.getStatus}
        ${this.getButton}
      </form>
    </div>`;
  }

  get getTitle() {
    return `
      <div class="form-group form-group__half_left">
        <fieldset>
          <label class="form-label">Название товара</label>
          <input required="" type="text" name="title" class="form-control"  placeholder="Название товара" id="title"/>
        </fieldset>
      </div>`;
  }

  get getDescription() {
    return `
      <div class="form-group form-group__wide">
        <label class="form-label">Описание</label>
        <textarea required="" class="form-control" name="description" data-element="productDescription" placeholder="Описание товара" id="description"></textarea>
      </div>`;
  }

  get getUploadImages() {
    return `
      <div class="form-group form-group__wide" data-element="sortable-list-container">
        <label class="form-label">Фото</label>
        <div data-element="imageListContainer"></div>
        <button type="button" name="uploadImage" class="button-primary-outline">
          <span>Загрузить</span>
        </button>
      </div>`;
  }

  getTemplateImageList(data = []) {
    return data.map(item => {
      const element = document.createElement('li');
      element.classList.add('products-edit__imagelist-item');

      element.innerHTML = `
      <input type="hidden" name="url" value="${item.url}"/>
        <input type="hidden"name="source"value="${item.source}"/>
        <span>
          <img src="icon-grab.svg" data-grab-handle alt="grab" />
          <img class="sortable-table__cell-img" alt="Image" src="${item.url}"/>
          <span>${item.source}</span>
        </span>
        <button type="button">
          <img src="icon-trash.svg" data-delete-handle alt="delete" />
        </button>`;

      return element;
    });
  }

  get getCategory() {
    return `
      <div class="form-group form-group__half_left">
        <label class="form-label">Категория</label>
        <select class="form-control" name="subcategory" id="subcategory">
        </select>
      </div>`;
  }

  get getPriceAndDiscount() {
    return `
    <div class="form-group form-group__half_left form-group__two-col">
      <fieldset>
        <label class="form-label">Цена ($)</label>
        <input required="" type="number" name="price" class="form-control" placeholder="100" id="price"/>
      </fieldset>
      <fieldset>
        <label class="form-label">Скидка ($)</label>
        <input required="" type="number" name="discount" class="form-control" placeholder="0" id="discount"/>
      </fieldset>
    </div>`;
  }

  get getQuantity() {
    return `
    <div class="form-group form-group__part-half">
      <label class="form-label">Количество</label>
      <input required="" type="number" class="form-control" name="quantity" placeholder="1" id="quantity"/>
    </div>`;
  }

  get getStatus() {
    return `
    <div class="form-group form-group__part-half">
      <label class="form-label">Статус</label>
      <select class="form-control" name="status" id="status">
        <option value="1">Активен</option>
        <option value="0">Неактивен</option>
      </select>
    </div>`;
  }

  get getButton() {
    return `
      <div class="form-buttons">
        <button type="submit" name="save" class="button-primary-outline">
          ${this.productId ? 'Сохранить товар' : 'Добавить товар'}
        </button>
      </div>`;
  }

  loadData() {
    try {
      return Promise.all([this.loadCategoriesData(), this.loadProductData()]);
    } catch (error) {
      throw new Error(error);
    }
  }

  setCategoriesDataOnForm(data = []) {
    this.formElements.subcategory.innerHTML = data
      .map(item => this.getTemplateOptionsCategory(item).join(''))
      .join('');
  }

  getTemplateOptionsCategory(data) {
    return data.subcategories?.map(
      item => new Option(escapeHtml(data.title) + ' > ' + escapeHtml(item.title), item.id).outerHTML
    );
  }

  setProductDataOnForm(data) {
    const { title, description, subcategory, price, discount, quantity, status } =
      this.formElements;

    const sortableImageList = new SortableList({
      items: this.getTemplateImageList(data.images)
    });
    this.subElements.imageListContainer.append(sortableImageList.element);

    title.value = data.title;
    description.value = data.description;
    subcategory.value = data.subcategory;
    price.value = data.price;
    discount.value = data.discount;
    quantity.value = data.quantity;
    status.value = data.status;
  }

  loadCategoriesData() {
    const requestURL = new URL('api/rest/categories', BACKEND_URL);
    requestURL.searchParams.set('_sort', 'weight');
    requestURL.searchParams.set('_refs', 'subcategory');

    return fetchJson(requestURL);
  }

  loadProductData() {
    if (this.productId) {
      const requestURL = new URL('api/rest/products', BACKEND_URL);
      requestURL.searchParams.set('id', this.productId);

      return fetchJson(requestURL);
    }

    return Promise.resolve(null);
  }

  initEventListeners() {
    this.formElements.uploadImage.addEventListener('click', this.onUploadImageButtonClickHandler);

    this.element.addEventListener('submit', event => {
      event.preventDefault();
      this.save();
    });
  }

  async save() {
    let notification;
    try {
      const saveFormObject = this.getSendFormObject();
      const responseURL = new URL('api/rest/products', BACKEND_URL);

      await fetchJson(responseURL, {
        method: this.productId ? 'PATCH' : 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: JSON.stringify(saveFormObject)
      });

      if (this.productId) {
        notification = new NotificationMessage('Данные обновлены', {
          duration: 2000,
          type: 'success'
        });
        notification.show();

        this.element.dispatchEvent(
          new CustomEvent('product-updated', { detail: 'Данные обновлены' })
        );
      } else {
        notification = new NotificationMessage('Данные сохранены', {
          duration: 2000,
          type: 'success'
        });
        notification.show();

        this.element.dispatchEvent(
          new CustomEvent('product-saved', { detail: 'Данные сохранены' })
        );
      }
    } catch (error) {
      notification = new NotificationMessage(error.message, {
        duration: 2000,
        type: 'error'
      });
      notification.show();

      throw new Error(error.message);
    }
  }

  getSendFormObject() {
    const { imageListContainer } = this.subElements;
    const { title, description, subcategory, price, discount, quantity, status } =
      this.formElements;

    const sendFormObject = {
      id: this.productId,
      title: escapeHtml(title.value),
      description: escapeHtml(description.value),
      subcategory: escapeHtml(subcategory.value),
      price: parseFloat(price.value),
      discount: parseFloat(discount.value),
      quantity: parseFloat(quantity.value),
      status: parseInt(status.value),
      images: []
    };

    const imageList = imageListContainer.querySelectorAll('.products-edit__imagelist-item');

    for (const image of imageList) {
      const url = image.querySelector("[name='url']").value;
      const source = image.querySelector("[name='source']").value;
      sendFormObject.images.push({
        url,
        source
      });
    }

    return sendFormObject;
  }

  onUploadImageButtonClickHandler = event => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    fileInput.onchange = async () => {
      const [file] = fileInput.files;

      if (file) {
        const formData = new FormData();
        const { uploadImage } = this.formElements;
        const { imageListContainer } = this.subElements;

        formData.append('image', file);

        uploadImage.classList.add('is-loading');
        uploadImage.disable = true;

        const response = await fetchJson('https://api.imgur.com/3/image', {
          method: 'POST',
          headers: {
            Authorization: 'Client-ID ' + IMGUR_CLIENT_ID
          },
          referrer: '',
          body: formData
        });

        const imageItem = this.getTemplateImageList([
          {
            url: escapeHtml(response.data.link),
            source: escapeHtml(file.name)
          }
        ])[0];
        imageItem.classList.add('sortable-list__item');
        imageListContainer.firstElementChild.append(imageItem);

        uploadImage.classList.remove('is-loading');
        uploadImage.disable = false;
      }
    };

    fileInput.hidden = true;
    this.subElements.productForm.append(fileInput);
    fileInput.click();

    fileInput.remove();
  };

  getSubElements() {
    const result = {};
    const elementsDOM = this.element.querySelectorAll('[data-element]');

    for (const subElement of elementsDOM) {
      result[subElement.dataset.element] = subElement;
    }

    return result;
  }

  remove() {
    if (this.element) {
      this.element.remove();
    }
  }

  destroy() {
    this.remove();
    this.element = null;
    this.formElements = {};
    this.subElements = {};
  }
}
