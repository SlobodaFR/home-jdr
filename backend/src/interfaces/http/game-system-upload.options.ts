import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const MAX_RULES_PDF_BYTES = 10 * 1024 * 1024; // 10 MB - rules PDFs are short (see PRD.md).

export const rulesPdfUploadOptions: MulterOptions = {
  limits: { fileSize: MAX_RULES_PDF_BYTES },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== 'application/pdf') {
      callback(new BadRequestException('rulesFile must be a PDF'), false);
      return;
    }
    callback(null, true);
  },
};
