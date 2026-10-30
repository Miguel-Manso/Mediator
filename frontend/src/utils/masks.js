/**
 * Utilitários puros de máscaras e formatações para entradas de formulário e exibições.
 */

/**
 * Remove todos os caracteres não numéricos.
 * @param {string|number} value
 * @returns {string}
 */
export const unmask = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\D/g, '');
};

/**
 * Aplica máscara de CPF: 000.000.000-00 (máximo 11 dígitos numéricos)
 * @param {string|number} value
 * @returns {string}
 */
export const maskCPF = (value) => {
  const digits = unmask(value).slice(0, 11);
  if (!digits) return '';

  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
};

/**
 * Aplica máscara de Telefone / Celular dinâmico:
 * Fixo (10 dígitos): (00) 0000-0000
 * Celular (11 dígitos): (00) 00000-0000
 * @param {string|number} value
 * @returns {string}
 */
export const maskPhone = (value) => {
  const digits = unmask(value).slice(0, 11);
  if (!digits) return '';

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
};

/**
 * Aplica máscara de CEP: 00000-000 (máximo 8 dígitos numéricos)
 * @param {string|number} value
 * @returns {string}
 */
export const maskCEP = (value) => {
  const digits = unmask(value).slice(0, 8);
  if (!digits) return '';

  return digits.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
};

/**
 * Formata um valor numérico ou string em Moeda Brasileira (R$ 0,00).
 * @param {string|number} value
 * @returns {string}
 */
export const maskCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const cleanNumber = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (isNaN(cleanNumber)) return '';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cleanNumber);
};

/**
 * Formata digitação de moeda em tempo real (centavos).
 * @param {string|number} value
 * @returns {string}
 */
export const maskCurrencyInput = (value) => {
  const digits = unmask(value);
  if (!digits) return '';

  const numberValue = Number(digits) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);
};
