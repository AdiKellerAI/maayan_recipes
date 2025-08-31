import React from 'react';
import { Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[60]"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg max-w-sm w-full p-3 sm:p-4 mx-2 sm:mx-0"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">מחיקת מתכון</h3>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-1 text-sm">
            האם אתה בטוח שברצונך למחוק את המתכון?
          </p>
          <p className="text-xs text-red-600 font-medium">
            פעולה זו לא ניתנת לביטול.
          </p>
        </div>
        
        <div className="flex space-x-2 rtl:space-x-reverse">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className="flex-1 px-3 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            ביטול
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConfirm();
            }}
            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium text-sm"
          >
            מחק
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
