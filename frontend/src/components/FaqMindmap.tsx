import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
  ReactFlowProvider,
  NodeProps,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import api from '../services/api';
import { AxiosError } from 'axios';

// Кастомный компонент узла с кнопками
const CustomNode = ({ data, id }: NodeProps) => {
  console.log('CustomNode render:', id, data);
  
  return (
    <div style={{
      padding: '12px',
      borderRadius: '8px',
      backgroundColor: 'white',
      border: '2px solid var(--whatsapp-teal)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      minWidth: '200px',
      maxWidth: '250px'
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        {data.label}
      </div>
      <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>
        {data.answer?.substring(0, 50)}...
      </div>
      
      {/* Отображение кнопок действий на узле */}
      {data.buttons && Array.isArray(data.buttons) && data.buttons.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          marginBottom: '8px',
          padding: '4px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        }}>
          {data.buttons.map((btn: any, idx: number) => (
            <span key={idx} style={{
              fontSize: '0.7rem',
              padding: '2px 6px',
              backgroundColor: 'var(--whatsapp-teal)',
              color: 'white',
              borderRadius: '12px'
            }}>
              {btn.text}
            </span>
          ))}
        </div>
      )}

      {/* Индикатор прикрепленного файла */}
      {data.file_path && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '8px',
          padding: '4px 8px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          fontSize: '0.8rem'
        }}>
          <i className="fas fa-paperclip" style={{ color: 'var(--whatsapp-teal)' }}></i>
          <span style={{ color: '#555' }}>Есть документ</span>
          <button
            onClick={() => data.onDownload(data.file_path)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'var(--whatsapp-teal)',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-download"></i>
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
        <button 
          onClick={() => data.onEdit(id, data)}
          style={{
            border: 'none',
            background: 'var(--whatsapp-teal)',
            color: 'white',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          ✎
        </button>
        <button 
          onClick={() => data.onAddChild(id)}
          style={{
            border: 'none',
            background: 'var(--whatsapp-green)',
            color: 'white',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          +
        </button>
        <button 
          onClick={() => data.onDelete(id)}
          style={{
            border: 'none',
            background: '#d32f2f',
            color: 'white',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          🗑
        </button>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

interface FaqMindmapProps {
  rootId: number;
  rootQuestion: string;
  onClose: () => void;
}

const FaqMindmap: React.FC<FaqMindmapProps> = ({ rootId, rootQuestion, onClose }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showButtonForm, setShowButtonForm] = useState(false);
  const [showFileUploadForm, setShowFileUploadForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    parentId: null as number | null,
    keywords: '',
    question: '',
    answer: ''
  });
  const [buttonFormData, setButtonFormData] = useState({
    nodeId: null as string | null,
    text: ''
  });
  const [editFormData, setEditFormData] = useState({
    keywords: '',
    question: '',
    answer: '',
    buttons: [] as Array<{text: string}>,
    file_path: null as string | null
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Загрузка данных с бэкенда
  useEffect(() => {
    fetchMindmapData();
  }, [rootId]);

  const fetchMindmapData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await api.get(`/admin/faq/mindmap/${rootId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { nodes: fetchedNodes, edges: fetchedEdges } = response.data;
      console.log('Fetched nodes:', fetchedNodes);
      
      // Добавляем обработчики к данным узлов
      const nodesWithHandlers = fetchedNodes.map((node: any) => ({
        ...node,
        type: 'custom',
        data: {
          ...node.data,
          buttons: Array.isArray(node.data.buttons) ? node.data.buttons : [],
          file_path: node.data.file_path || null,
          onEdit: (id: string, nodeData: any) => handleEditNode(id, nodeData),
          onAddChild: (id: string) => handleAddChild(id),
          onDelete: (id: string) => handleDeleteNode(id),
          onDownload: (filePath: string) => handleDownloadFile(filePath)
        }
      }));

      setNodes(nodesWithHandlers);
      setEdges(fetchedEdges);
    } catch (error) {
      console.error('Error loading mindmap:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditNode = (nodeId: string, nodeData: any) => {
    console.log('handleEditNode called with:', nodeId, nodeData);
    
    // Создаем узел из переданных данных
    const node = {
      id: nodeId,
      data: nodeData,
      position: { x: 0, y: 0 }
    } as Node;
    
    // Убеждаемся, что buttons - это массив
    const buttons = Array.isArray(nodeData.buttons) ? nodeData.buttons : [];
    
    setEditFormData({
      keywords: nodeData.keywords || '',
      question: nodeData.question || '',
      answer: nodeData.answer || '',
      buttons: buttons,
      file_path: nodeData.file_path || null
    });
    setSelectedNode(node);
    setSelectedFile(null);
    console.log('selectedNode set to:', node);
    console.log('editFormData.buttons is array:', Array.isArray(buttons));
  };

  const handleAddChild = (parentId: string) => {
    console.log('Adding child to:', parentId);
    setAddFormData({
      parentId: parseInt(parentId),
      keywords: '',
      question: '',
      answer: ''
    });
    setShowAddForm(true);
  };

  const handleDeleteNode = async (nodeId: string) => {
    console.log('Deleting node:', nodeId);
    if (!window.confirm('Удалить этот узел и все дочерние?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/admin/faq/${nodeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Обновляем граф
      fetchMindmapData();
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  const handleDownloadFile = (filePath: string) => {
    window.open(`http://31.130.155.16:5001${filePath}`, '_blank');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleCreateNode = async () => {
    if (!addFormData.keywords || !addFormData.answer) {
      alert('Заполните ключевые слова и ответ');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await api.post('/admin/faq/node', addFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowAddForm(false);
      fetchMindmapData(); // Перезагружаем граф
    } catch (error) {
      console.error('Error creating node:', error);
    }
  };

  const handleUpdateNode = async () => {
    if (!selectedNode) {
      console.log('No selected node to update');
      return;
    }

    console.log('Updating node:', selectedNode.id);
    console.log('Update data (raw):', editFormData);

    try {
      const token = localStorage.getItem('token');
      
      // Если есть файл для загрузки, используем FormData
      if (selectedFile) {
        const formData = new FormData();
        formData.append('keywords', editFormData.keywords);
        formData.append('question', editFormData.question);
        formData.append('answer', editFormData.answer);
        formData.append('buttons', JSON.stringify(editFormData.buttons));
        formData.append('file', selectedFile);

        const response = await api.put(`/admin/faq/${selectedNode.id}`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        console.log('Update response:', response.data);
      } else {
        // Без файла - обычный JSON
        const updateData = {
          keywords: editFormData.keywords,
          question: editFormData.question,
          answer: editFormData.answer,
          buttons: editFormData.buttons
        };

        const response = await api.put(`/admin/faq/node/${selectedNode.id}`, updateData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Update response:', response.data);
      }
      
      setSelectedNode(null);
      fetchMindmapData(); // Перезагружаем граф
    } catch (error) {
      console.error('Error updating node:', error);
      if (error && typeof error === 'object' && 'isAxiosError' in error) {
        const axiosError = error as AxiosError;
        console.error('Response data:', axiosError.response?.data);
        console.error('Response status:', axiosError.response?.status);
      }
    }
  };

  const handleAddButton = () => {
    console.log('handleAddButton called with text:', buttonFormData.text);
    console.log('Current editFormData.buttons:', editFormData.buttons);
    console.log('Is array?', Array.isArray(editFormData.buttons));
    
    if (!buttonFormData.text.trim()) return;
    
    // Убеждаемся, что buttons - это массив
    const currentButtons = Array.isArray(editFormData.buttons) ? editFormData.buttons : [];
    
    setEditFormData({
      ...editFormData,
      buttons: [...currentButtons, { text: buttonFormData.text }]
    });
    setButtonFormData({ nodeId: null, text: '' });
    setShowButtonForm(false);
  };

  const handleRemoveButton = (index: number) => {
    console.log('Removing button at index:', index);
    
    // Убеждаемся, что buttons - это массив
    const currentButtons = Array.isArray(editFormData.buttons) ? editFormData.buttons : [];
    
    const newButtons = [...currentButtons];
    newButtons.splice(index, 1);
    setEditFormData({
      ...editFormData,
      buttons: newButtons
    });
  };

  const handleNodeDragStop = useCallback(async (event: any, node: Node) => {
    try {
      const token = localStorage.getItem('token');
      await api.put(`/admin/faq/node/${node.id}/position`, 
        { x: node.position.x, y: node.position.y },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error saving position:', error);
    }
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Не выделяем узел при клике на кнопки
    if ((event.target as HTMLElement).tagName === 'BUTTON') return;
    console.log('Node clicked:', node.id, node.data);
    handleEditNode(node.id, node.data);
  }, []);

  if (loading) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        Загрузка...
      </div>
    );
  }

  console.log('Rendering, selectedNode:', selectedNode);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        onlyRenderVisibleElements={true}
      >
        <Controls />
        <Background />
        <Panel position="top-right">
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ✕ Закрыть
          </button>
        </Panel>
        
        {selectedNode && (
          <Panel position="bottom-right" style={{ 
            background: 'white', 
            padding: '16px', 
            borderRadius: '8px', 
            boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
            maxWidth: '350px',
            zIndex: 10,
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 12px 0' }}>Редактирование</h3>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Ключевые слова *
              </label>
              <input
                type="text"
                value={editFormData.keywords}
                onChange={(e) => setEditFormData({...editFormData, keywords: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Вопрос
              </label>
              <input
                type="text"
                value={editFormData.question}
                onChange={(e) => setEditFormData({...editFormData, question: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Ответ *
              </label>
              <textarea
                value={editFormData.answer}
                onChange={(e) => setEditFormData({...editFormData, answer: e.target.value})}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>

            {/* Секция для загрузки файла */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Прикрепленный документ
              </label>
              
              {editFormData.file_path && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '4px'
                }}>
                  <i className="fas fa-file-pdf" style={{ color: 'var(--whatsapp-teal)' }}></i>
                  <span style={{ flex: 1, fontSize: '0.9rem' }}>
                    {editFormData.file_path.split('/').pop()}
                  </span>
                  <button
                    onClick={() => handleDownloadFile(editFormData.file_path!)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--whatsapp-teal)',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fas fa-download"></i>
                  </button>
                </div>
              )}

              <input
                type="file"
                onChange={handleFileChange}
                style={{
                  width: '100%',
                  padding: '4px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
              {selectedFile && (
                <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                  Выбран файл: {selectedFile.name}
                </small>
              )}
            </div>

            {/* Секция кнопок действий */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Кнопки для чата
              </label>
              
              {/* Список существующих кнопок */}
              {Array.isArray(editFormData.buttons) && editFormData.buttons.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px'
                }}>
                  {editFormData.buttons.map((btn, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      backgroundColor: 'var(--whatsapp-teal)',
                      color: 'white',
                      borderRadius: '16px',
                      fontSize: '0.85rem'
                    }}>
                      <span>{btn.text}</span>
                      <button
                        onClick={() => handleRemoveButton(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          padding: '0 2px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Кнопка добавления новой кнопки */}
              {!showButtonForm ? (
                <button
                  onClick={() => {
                    setButtonFormData({ nodeId: selectedNode.id, text: '' });
                    setShowButtonForm(true);
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f0f0f0',
                    border: '1px dashed #999',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  + Добавить кнопку
                </button>
              ) : (
                <div style={{
                  padding: '8px',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}>
                  <input
                    type="text"
                    placeholder="Текст кнопки"
                    value={buttonFormData.text}
                    onChange={(e) => setButtonFormData({...buttonFormData, text: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '6px',
                      marginBottom: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleAddButton}
                      style={{
                        padding: '4px 12px',
                        backgroundColor: 'var(--whatsapp-teal)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Добавить
                    </button>
                    <button
                      onClick={() => setShowButtonForm(false)}
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#f0f0f0',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
              <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                Эти кнопки увидят пользователи в чате
              </small>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleUpdateNode}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--whatsapp-teal)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Сохранить
              </button>
              <button
                onClick={() => setSelectedNode(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
            </div>
          </Panel>
        )}

        {showAddForm && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
            minWidth: '400px',
            zIndex: 20
          }}>
            <h3 style={{ marginTop: 0 }}>Новый узел</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Ключевые слова *
              </label>
              <input
                type="text"
                value={addFormData.keywords}
                onChange={(e) => setAddFormData({...addFormData, keywords: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Вопрос
              </label>
              <input
                type="text"
                value={addFormData.question}
                onChange={(e) => setAddFormData({...addFormData, question: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                Ответ *
              </label>
              <textarea
                value={addFormData.answer}
                onChange={(e) => setAddFormData({...addFormData, answer: e.target.value})}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCreateNode}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--whatsapp-teal)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Создать
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </ReactFlow>
    </div>
  );
};

// Оборачиваем в ReactFlowProvider
const FaqMindmapWithProvider: React.FC<FaqMindmapProps> = (props) => (
  <ReactFlowProvider>
    <FaqMindmap {...props} />
  </ReactFlowProvider>
);

export default FaqMindmapWithProvider;
