class APIFeatures {
    constructor(query, queryStr) {
      this.query = query;
      this.queryStr = queryStr;
    }
  
    search() {
      const keyword = this.queryStr.keyword
        ? {
            name: {
              $regex: this.queryStr.keyword,
              $options: "i",
            },
          }
        : {};
      // console.log(this.queryStr);
      this.query = this.query.find({ ...keyword });
      return this;
    }
  
    filter() {
      const queryCopy = { ...this.queryStr };
  
      // Removing fields from the query
      const removeFields = ["keyword", "limit", "page"];
      removeFields.forEach((el) => delete queryCopy[el]);
      // console.log(queryCopy);
      // Advance filter for price, ratings etc
      let queryStr = JSON.stringify(queryCopy);
  
      queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`);
      // console.log(queryStr);
      this.query = this.query.find(JSON.parse(queryStr));
      // console.log(this.query);
      return this;
    }
  
    pagination(resPerPage) {
      const currentPage = Number(this.queryStr.page) || 1;
      const skip = resPerPage * (currentPage - 1);
  
      this.query = this.query.limit(resPerPage).skip(skip);
      return this;
    }
    infiniteScroll(resPerPage) {
      const skip = Number(this.queryStr.skip) || 0;
  
      this.query = this.query.limit(resPerPage).skip(skip);
  
      this.queryStr.skip = skip + resPerPage;
  
      return this;
    }
  }
  
  module.exports = APIFeatures;
  