import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const MAX_RULES_PDF_BYTES = 100 * 1024 * 1024; // 100 MB

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
