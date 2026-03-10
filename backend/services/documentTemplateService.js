const pool = require('../config/db');
const fs = require('fs').promises;
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

class DocumentTemplateService {
  
  // Получить шаблоны для организации
  async getTemplates(organizationId, type = null) {
    try {
      let query = `
        SELECT * FROM document_templates 
        WHERE (organization_id = $1 OR organization_id IS NULL) 
        AND is_active = true
      `;
      const params = [organizationId];
      
      if (type) {
        query += ` AND template_type = $2`;
        params.push(type);
      }
      
      query += ` ORDER BY name`;
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  }

  // Получить шаблон по ID
  async getTemplateById(id, organizationId) {
    try {
      const result = await pool.query(
        `SELECT * FROM document_templates 
         WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)`,
        [id, organizationId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error getting template by id:', error);
      throw error;
    }
  }

  // Создать новый шаблон
  async createTemplate(templateData, file) {
    try {
      const { 
        organization_id, 
        name, 
        description, 
        template_type, 
        fields,
        is_active 
      } = templateData;

      const result = await pool.query(
        `INSERT INTO document_templates 
         (organization_id, name, description, template_type, file_path, fields, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          organization_id || null,
          name,
          description,
          template_type,
          file.path,
          fields || [],
          is_active !== undefined ? is_active : true
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  // Обновить шаблон
  async updateTemplate(id, organizationId, templateData, file = null) {
    try {
      const { name, description, template_type, fields, is_active } = templateData;
      
      let query = `
        UPDATE document_templates 
        SET name = $1, description = $2, template_type = $3, 
            fields = $4, is_active = $5, updated_at = NOW()
      `;
      const params = [name, description, template_type, fields, is_active];
      
      if (file) {
        // Получаем старый файл для удаления
        const oldTemplate = await this.getTemplateById(id, organizationId);
        if (oldTemplate && oldTemplate.file_path) {
          try {
            await fs.unlink(oldTemplate.file_path);
          } catch (err) {
            console.warn('Failed to delete old template file:', err);
          }
        }
        
        query += `, file_path = $6`;
        params.push(file.path);
      }
      
      query += ` WHERE id = $${params.length + 1} AND (organization_id = $${params.length + 2} OR organization_id IS NULL) RETURNING *`;
      params.push(id, organizationId);
      
      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  // Удалить шаблон
  async deleteTemplate(id, organizationId) {
    try {
      // Получаем информацию о файле перед удалением
      const template = await this.getTemplateById(id, organizationId);
      
      if (template) {
        // Удаляем файл
        try {
          await fs.unlink(template.file_path);
        } catch (err) {
          console.warn('Failed to delete template file:', err);
        }
      }
      
      const result = await pool.query(
        'DELETE FROM document_templates WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL) RETURNING *',
        [id, organizationId]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  // Получить данные пользователя для заполнения
  async getUserData(userId) {
    try {
      const result = await pool.query(
        `SELECT 
          u.id,
          u.full_name,
          u.department as position,
          u.vacation_days_total,
          u.vacation_days_left,
          u.organization_id,
          o.name as organization_name
         FROM users u
         LEFT JOIN organizations o ON u.organization_id = o.id
         WHERE u.id = $1`,
        [userId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error getting user data:', error);
      throw error;
    }
  }

  // Заполнить docx шаблон
  async fillDocxTemplate(templatePath, data) {
    try {
      // Читаем файл как бинарные данные
      const content = await fs.readFile(templatePath, 'binary');
      
      // Распаковываем docx
      const zip = new PizZip(content);
      
      // Создаем экземпляр Docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Заполняем данными
      doc.render(data);

      // Генерируем буфер
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      return buffer;
    } catch (error) {
      console.error('Error filling docx template:', error);
      throw error;
    }
  }

  // Заполнить текстовый шаблон
  async fillTextTemplate(templatePath, data) {
    try {
      let content = await fs.readFile(templatePath, 'utf8');
      
      for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`{${key}}`, 'g');
        content = content.replace(regex, value || '_____');
      }
      
      return content;
    } catch (error) {
      console.error('Error filling text template:', error);
      throw error;
    }
  }

  // Заполнить шаблон (автоматически определяет тип)
  async fillTemplate(templateId, userId, customFields = {}) {
    try {
      // Получаем данные пользователя
      const userData = await this.getUserData(userId);
      if (!userData) {
        throw new Error('User not found');
      }
      
      // Получаем шаблон
      const template = await this.getTemplateById(templateId, userData.organization_id);
      if (!template) {
        throw new Error('Template not found');
      }

      // Подготавливаем данные для заполнения
      const fillData = {
        FULL_NAME: userData.full_name || '',
        POSITION: userData.position || '',
        DEPARTMENT: userData.position || '',
        ORGANIZATION: userData.organization_name || '',
        VACATION_DAYS_TOTAL: userData.vacation_days_total || '',
        VACATION_DAYS_LEFT: userData.vacation_days_left || '',
        VACATION_DAYS_USED: (userData.vacation_days_total - userData.vacation_days_left) || '',
        DATE: new Date().toLocaleDateString('ru-RU'),
        ...customFields
      };

      // Определяем тип файла по расширению
      const ext = path.extname(template.file_path).toLowerCase();
      let filledContent;
      
      if (ext === '.docx') {
        filledContent = await this.fillDocxTemplate(template.file_path, fillData);
      } else {
        filledContent = await this.fillTextTemplate(template.file_path, fillData);
      }

      // Проверяем, все ли поля заполнены
      const missingFields = (template.fields || []).filter(field => 
        !fillData[field] && fillData[field] !== undefined && field !== 'DATE'
      );

      return {
        content: filledContent,
        contentType: ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/plain',
        template: {
          id: template.id,
          name: template.name,
          type: template.template_type
        },
        missingFields,
        userData
      };
    } catch (error) {
      console.error('Error filling template:', error);
      throw error;
    }
  }
}

module.exports = new DocumentTemplateService();
