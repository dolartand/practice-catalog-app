import { DeleteOutlined, InboxOutlined, StarFilled } from '@ant-design/icons';
import { App as AntdApp, Button, Card, Checkbox, Flex, Space, Tag, Typography, Upload } from 'antd';
import { useRef, useState } from 'react';

import type { Product, ProductImage } from '@entities/product';
import {
  useDeleteImage,
  useUpdateImage,
  useUploadImage,
} from '@entities/product';


interface ImageManagerProps {
  product: Product;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export function ImageManager({ product }: ImageManagerProps) {
  const { message, modal } = AntdApp.useApp();

  const uploadMutation = useUploadImage(product.id);
  const updateImage = useUpdateImage(product.id);
  const deleteImage = useDeleteImage(product.id);

  // Чекбокс «сделать главным» применяется к следующей партии загрузки
  const [makeMainNext, setMakeMainNext] = useState(false);
  const dragIndexRef = useRef<number | null>(null);

  const images = [...product.images].sort((a, b) => a.position - b.position);

  const beforeUpload = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      message.error('Поддерживаются только JPEG, PNG и WebP');
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      message.error(`«${file.name}» больше 10 МБ`);
      return false;
    }
    // Первое изображение всегда главное — иначе у товара не будет превью
    const isMain = images.length === 0 ? true : makeMainNext;

    void uploadMutation
      .mutateAsync({ file, isMain })
      .then(() => message.success(`«${file.name}» загружено`))
      .catch(() => undefined);

    return false;
  };

  const setMain = (image: ProductImage) => {
    void updateImage.mutateAsync({ imageId: image.id, patch: { isMain: true } }).then(() => {
      message.success('Главное изображение обновлено');
    });
  };

  const confirmDelete = (image: ProductImage) => {
    modal.confirm({
      title: 'Удалить изображение?',
      content: 'Файл будет удалён из хранилища; действие необратимо.',
      okText: 'Удалить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        await deleteImage.mutateAsync(image.id);
        message.success('Изображение удалено');
      },
    });
  };

  /** Порядок сохраняется последовательностью PATCH {position} только для сместившихся */
  const persistOrder = async (ordered: ProductImage[]) => {
    const changed = ordered
      .map((image, index) => ({ image, index }))
      .filter(({ image, index }) => image.position !== index);

    if (changed.length === 0) return;

    try {
      await Promise.all(
        changed.map(({ image, index }) =>
          updateImage.mutateAsync({ imageId: image.id, patch: { position: index } }),
        ),
      );
      message.success('Порядок сохранён');
    } catch {
      // частичный сбой: рефетч вернёт фактический порядок
    }
  };

  const onDropAt = (targetIndex: number) => {
    const fromIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (fromIndex == null || fromIndex === targetIndex) return;

    const next = [...images];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return;
    next.splice(targetIndex, 0, moved);
    void persistOrder(next);
  };

  return (
    <Card title="Изображения">
      <Upload.Dragger
        multiple
        accept=".jpg,.jpeg,.png,.webp"
        showUploadList={false}
        disabled={uploadMutation.isPending}
        beforeUpload={(file) => beforeUpload(file)}
        style={{ marginBottom: 16 }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Перетащите файлы или нажмите для выбора</p>
        <p className="ant-upload-hint">JPEG / PNG / WebP, до 10 МБ каждое</p>
      </Upload.Dragger>

      {images.length > 0 && (
        <Checkbox
          checked={makeMainNext}
          onChange={(e) => setMakeMainNext(e.target.checked)}
          style={{ marginBottom: 12 }}
        >
          Сделать главным при загрузке
        </Checkbox>
      )}

      {images.length === 0 ? (
        <Typography.Paragraph type="secondary">
          У товара нет изображений — в списках магазина будет показан плейсхолдер. Первое
          загруженное изображение автоматически становится главным.
        </Typography.Paragraph>
      ) : (
        <Flex gap={12} wrap>
          {images.map((image, index) => (
            <Flex key={image.id} vertical gap={4}>
              <div
                draggable
                onDragStart={() => {
                  dragIndexRef.current = index;
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDropAt(index)}
                style={{ width: 132, cursor: 'grab' }}
                title="Перетащите, чтобы изменить порядок"
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={image.url}
                    alt={`${product.name} — изображение ${index + 1}`}
                    style={{
                      width: '100%',
                      height: 104,
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: image.isMain ? '2px solid #2f54eb' : '1px solid #f0f0f0',
                      display: 'block',
                    }}
                  />
                  <Tag
                    style={{ position: 'absolute', top: 4, left: 4, marginInlineEnd: 0 }}
                    color="default"
                  >
                    {index + 1}
                  </Tag>
                  {image.isMain && (
                    <Tag color="blue" icon={<StarFilled />} style={{ position: 'absolute', bottom: 4, left: 4 }}>
                      Главное
                    </Tag>
                  )}
                </div>
              </div>
              <Space size={4}>
                <Button
                  size="small"
                  icon={<StarFilled />}
                  disabled={image.isMain}
                  loading={
                    updateImage.isPending &&
                    updateImage.variables?.imageId === image.id &&
                    updateImage.variables?.patch?.isMain === true
                  }
                  onClick={() => setMain(image)}
                />
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleteImage.isPending && deleteImage.variables === image.id}
                  onClick={() => confirmDelete(image)}
                />
              </Space>
            </Flex>
          ))}
        </Flex>
      )}

      {images.length > 1 && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 12 }}>
          Порядковые номера задают последовательность галереи на витрине; перетаскивайте
          миниатюры, чтобы изменить порядок.
        </Typography.Paragraph>
      )}
    </Card>
  );
}
