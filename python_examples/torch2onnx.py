import torch
import torch.onnx


class Test(torch.nn.Module):
    def __init__(self):
        super(Test, self).__init__()
        self.conv = torch.nn.Conv2d(3, 3, kernel_size=1, stride=1, padding=0)

    def forward(self, x):
        x = self.conv(x)
        return x


model = Test()
image = torch.randn((1, 3, 518, 518))
output = model(image)
# output
torch.onnx.export(
    model,
    image,
    "test.onnx",
    input_names=['input'],
    output_names=['output0'],
    opset_version=13

)
model
