class EmailProvider {
  async sendEmail(options) {
    throw new Error("EmailProvider#sendEmail() must be implemented by subclass");
  }
}

module.exports = EmailProvider;
